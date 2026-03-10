import Message from '../models/Message.js';

const onlineUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ====== USER ONLINE ======
    socket.on('user:online', (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit('user:status', { userId, online: true });
      console.log(`👤 User online: ${userId}`);
    });

    // ====== MESSAGING ======
    socket.on('message:send', async (data) => {
      try {
        const { senderId, receiverId, text } = data;

        const message = await Message.create({
          sender: senderId,
          receiver: receiverId,
          text,
        });

        // Send to receiver if online
        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket).emit('message:receive', message);
        }

        // Confirm to sender
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
      if (senderSocket) {
        io.to(senderSocket).emit('message:read-ack', { by: receiverId });
      }
    });

    // ====== VIDEO CALL SIGNALING ======
    // Store who is in which room and their role
    const roomsMap = new Map();

    socket.on('call:join-room', ({ roomId, role }) => {
      socket.join(roomId);

      if (!roomsMap.has(roomId)) {
        roomsMap.set(roomId, { doctorId: null, patientId: null });
      }

      const room = roomsMap.get(roomId);
      const isDoc = role === 'doctor' || role === 'admin';

      if (isDoc) {
        room.doctorId = socket.id;
        // Notify anyone in the waiting room that the doctor has arrived
        io.to(`${roomId}-waiting`).emit('call:room-status', { hasDoctor: true });
      } else {
        room.patientId = socket.id;
      }

      console.log(`📹 User joined room ${roomId} (Role: ${role})`);

      // If patient joins and doctor isn't there yet
      if (!isDoc && !room.doctorId) {
        socket.emit('call:waiting-for-doctor');
      }
      // If doctor joins and patient is already there
      else if (isDoc && room.patientId) {
        io.to(roomId).emit('call:ready');
      }
      // If patient joins and doctor is already there
      else if (!isDoc && room.doctorId) {
        io.to(roomId).emit('call:ready');
      }
    });

    // For users waiting in the waiting room UI
    socket.on('call:check-room', (roomId) => {
      socket.join(`${roomId}-waiting`);
      const room = roomsMap.get(roomId);
      socket.emit('call:room-status', { hasDoctor: !!(room && room.doctorId) });
    });

    socket.on('call:offer', ({ roomId, offer }) => {
      socket.to(roomId).emit('call:offer', { offer, from: socket.id });
    });

    socket.on('call:answer', ({ roomId, answer }) => {
      socket.to(roomId).emit('call:answer', { answer, from: socket.id });
    });

    socket.on('call:ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('call:ice-candidate', { candidate, from: socket.id });
    });

    socket.on('call:end', (roomId) => {
      socket.to(roomId).emit('call:ended');
      socket.leave(roomId);
      const room = roomsMap.get(roomId);
      if (room) {
        if (room.doctorId === socket.id) {
          room.doctorId = null;
          io.to(`${roomId}-waiting`).emit('call:room-status', { hasDoctor: false });
        }
        if (room.patientId === socket.id) room.patientId = null;
        if (!room.doctorId && !room.patientId) roomsMap.delete(roomId);
      }
    });

    // ====== LIVE QUESTIONNAIRE ======
    socket.on('questionnaire:push', ({ roomId, questionnaire }) => {
      // Doctor pushes questionnaire to patient
      socket.to(roomId).emit('questionnaire:receive', questionnaire);
    });

    socket.on('questionnaire:submit', ({ roomId, responses }) => {
      // Patient submits answers back to doctor
      socket.to(roomId).emit('questionnaire:response', responses);
    });

    // ====== DISCONNECT ======
    socket.on('disconnect', () => {
      // Clean up roomsMap
      for (const [roomId, room] of roomsMap.entries()) {
        let changed = false;
        if (room.doctorId === socket.id) {
          room.doctorId = null;
          changed = true;
          io.to(`${roomId}-waiting`).emit('call:room-status', { hasDoctor: false });
        }
        if (room.patientId === socket.id) { room.patientId = null; changed = true; }
        if (changed) {
          socket.to(roomId).emit('call:ended');
        }
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
