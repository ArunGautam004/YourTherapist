import Message from '../models/Message.js';
import Appointment from '../models/Appointment.js';
const onlineUsers = new Map(); // userId -> socketId

// ✅ FIX #1: roomsMap must be OUTSIDE the connection handler
// Previously it was inside, so every new socket got a fresh empty map
// and could never see other participants.
const roomsMap = new Map(); // roomId -> { doctorId, patientId, participants: Map<socketId, {userId, name, role}> }

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ====== USER ONLINE ======
    socket.on('user:online', (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit('user:status', { userId, online: true });
      console.log(`👤 User online: ${userId}`);
    });

    // ====== MESSAGING (DMs) ======
    socket.on('message:send', async (data) => {
      try {
        const { senderId, receiverId, text } = data;
        const message = await Message.create({ sender: senderId, receiver: receiverId, text });
        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket) io.to(receiverSocket).emit('message:receive', message);
        socket.emit('message:sent', message);
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('message:read', async ({ senderId, receiverId }) => {
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, read: false },
        { read: true }
      );
      const senderSocket = onlineUsers.get(senderId);
      if (senderSocket) io.to(senderSocket).emit('message:read-ack', { by: receiverId });
    });

    // ====== VIDEO CALL SIGNALING ======

    // ✅ FIX #3: Accept userId, name, role from the client so we can
    // broadcast participant info to the other person
    socket.on('call:join-room', ({ roomId, role, userId, name }) => {
      socket.join(roomId);

      if (!roomsMap.has(roomId)) {
        roomsMap.set(roomId, {
          doctorId: null,
          patientId: null,
          participants: new Map(), // socketId -> { userId, name, role }
        });
      }

      const room = roomsMap.get(roomId);
      const isDoc = role === 'doctor' || role === 'admin';

      // Store participant info
      room.participants.set(socket.id, { userId, name, role });

      if (isDoc) {
        room.doctorId = socket.id;
        io.to(`${roomId}-waiting`).emit('call:room-status', { hasDoctor: true });
      } else {
        room.patientId = socket.id;
        // Mark patient as joined in the database
        Appointment.findOneAndUpdate(
          { meetingLink: `/session/${roomId}` },
          { patientJoined: true }
        ).catch(err => console.error('Failed to update patientJoined status:', err));
      }

      console.log(`📹 ${name || role} joined room ${roomId}`);

      const participant = { userId, name, role, socketId: socket.id };

      // Notify the *other* person already in the room that someone joined
      socket.to(roomId).emit('call:user-joined', { participant });

      // If both are now present, tell everyone call:ready with full participant list
      if (room.doctorId && room.patientId) {
        const participantList = Array.from(room.participants.entries()).map(
          ([, info]) => info
        );
        io.to(roomId).emit('call:ready', { participants: participantList });
        console.log(`✅ Room ${roomId} is ready — both participants connected`);
      } else if (!isDoc && !room.doctorId) {
        // Patient waiting, no doctor yet
        socket.emit('call:waiting-for-doctor');
      }
    });

    socket.on('call:check-room', (roomId) => {
      socket.join(`${roomId}-waiting`);
      const room = roomsMap.get(roomId);
      socket.emit('call:room-status', { hasDoctor: !!(room && room.doctorId) });
    });

    // WebRTC signaling — relay to everyone else in the room
    socket.on('call:offer', ({ roomId, offer }) => {
      console.log(`📡 Relaying offer in room ${roomId}`);
      socket.to(roomId).emit('call:offer', { offer, from: socket.id });
    });

    socket.on('call:answer', ({ roomId, answer }) => {
      console.log(`📡 Relaying answer in room ${roomId}`);
      socket.to(roomId).emit('call:answer', { answer, from: socket.id });
    });

    socket.on('call:ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('call:ice-candidate', { candidate, from: socket.id });
    });

    // Support both call:end({ roomId }) and call:end(roomId) for compatibility
    socket.on('call:end', (payload) => {
      const roomId = typeof payload === 'string' ? payload : payload?.roomId;
      if (!roomId) return;

      socket.to(roomId).emit('call:ended', {
        participant: roomsMap.get(roomId)?.participants.get(socket.id),
      });
      socket.leave(roomId);

      const room = roomsMap.get(roomId);
      if (room) {
        room.participants.delete(socket.id);
        if (room.doctorId === socket.id) {
          room.doctorId = null;
          io.to(`${roomId}-waiting`).emit('call:room-status', { hasDoctor: false });
        }
        if (room.patientId === socket.id) room.patientId = null;
        if (!room.doctorId && !room.patientId) roomsMap.delete(roomId);
      }
    });

    // ====== SESSION CHAT ======
    // ✅ FIX #2: room:message was completely missing from the server.
    // The client emits it but it was never relayed — so only the sender saw their message.
    socket.on('room:message', ({ roomId, message }) => {
      // Broadcast to everyone ELSE in the room (sender already added it locally)
      socket.to(roomId).emit('room:message', message);
      console.log(`💬 Message in room ${roomId}: ${message.text}`);
    });

    // ====== LIVE QUESTIONNAIRE ======
    socket.on('questionnaire:push', ({ roomId, questionnaire }) => {
      socket.to(roomId).emit('questionnaire:receive', questionnaire);
    });

    socket.on('questionnaire:submit', ({ roomId, responses }) => {
      socket.to(roomId).emit('questionnaire:response', responses);
    });

    // ====== DISCONNECT ======
    socket.on('disconnect', () => {
      // Clean up all rooms this socket was in
      for (const [roomId, room] of roomsMap.entries()) {
        if (!room.participants.has(socket.id)) continue;

        const participant = room.participants.get(socket.id);
        room.participants.delete(socket.id);

        if (room.doctorId === socket.id) {
          room.doctorId = null;
          io.to(`${roomId}-waiting`).emit('call:room-status', { hasDoctor: false });
        }
        if (room.patientId === socket.id) room.patientId = null;

        // Tell the other person who left
        socket.to(roomId).emit('call:ended', { participant });

        if (!room.doctorId && !room.patientId) roomsMap.delete(roomId);
      }

      // Remove from online users
      for (const [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          io.emit('user:status', { userId, online: false });
          break;
        }
      }

      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

export default initSocket;