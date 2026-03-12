import Message from '../models/Message.js';
import Appointment from '../models/Appointment.js';
import { createNotification } from '../controllers/notificationController.js';

const onlineUsers = new Map(); // userId -> socketId
const roomsMap = new Map();    // roomId -> { doctorId, patientId, participants }

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── USER ONLINE ──────────────────────────────────────────────────────
    // Each user joins a private room 'user:<userId>' so we can push
    // targeted notifications to them regardless of which page they're on.
    socket.on('user:online', (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`); // ✅ private notification room
      io.emit('user:status', { userId, online: true });
      console.log(`👤 User online: ${userId}`);
    });

    // ── DM MESSAGING ────────────────────────────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { senderId, receiverId, text, senderName } = data;

        const message = await Message.create({ sender: senderId, receiver: receiverId, text });

        // Deliver to receiver if online
        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket).emit('message:receive', message);
        }
        socket.emit('message:sent', message);

        // ✅ New-message notification to receiver
        const displayName = senderName || 'Someone';
        const notif = await createNotification({
          userId: receiverId,
          type: 'new_message',
          title: `💬 New message from ${displayName}`,
          message: text.length > 70 ? text.slice(0, 70) + '…' : text,
          link: '/patient/messages',
          meta: { senderId, senderName: displayName },
        });
        if (notif) {
          io.to(`user:${receiverId}`).emit('notification:new', notif);
        }
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

    // ── VIDEO CALL SIGNALING ─────────────────────────────────────────────
    socket.on('call:join-room', ({ roomId, role, userId, name }) => {
      socket.join(roomId);

      if (!roomsMap.has(roomId)) {
        roomsMap.set(roomId, {
          doctorId: null,
          patientId: null,
          participants: new Map(),
        });
      }

      const room = roomsMap.get(roomId);
      const isDoc = role === 'doctor' || role === 'admin';

      room.participants.set(socket.id, { userId, name, role });

      if (isDoc) {
        room.doctorId = socket.id;
        io.to(`${roomId}-waiting`).emit('call:room-status', { hasDoctor: true });
      } else {
        room.patientId = socket.id;
        Appointment.findOneAndUpdate(
          { meetingLink: `/session/${roomId}` },
          { patientJoined: true }
        ).catch(err => console.error('Failed to update patientJoined:', err));
      }

      console.log(`📹 ${name || role} joined room ${roomId}`);

      socket.to(roomId).emit('call:user-joined', {
        participant: { userId, name, role, socketId: socket.id },
      });

      if (room.doctorId && room.patientId) {
        const participantList = Array.from(room.participants.values());
        io.to(roomId).emit('call:ready', { participants: participantList });
        console.log(`✅ Room ${roomId} ready — both participants present`);
      } else if (!isDoc && !room.doctorId) {
        socket.emit('call:waiting-for-doctor');
      }
    });

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

    // ── SESSION ROOM CHAT ────────────────────────────────────────────────
    socket.on('room:message', ({ roomId, message }) => {
      socket.to(roomId).emit('room:message', message);
      console.log(`💬 Room message in ${roomId}: ${message.text}`);
    });

    // ── LIVE QUESTIONNAIRE ───────────────────────────────────────────────
    socket.on('questionnaire:push', ({ roomId, questionnaire }) => {
      socket.to(roomId).emit('questionnaire:receive', questionnaire);
    });

    socket.on('questionnaire:submit', ({ roomId, responses }) => {
      socket.to(roomId).emit('questionnaire:response', responses);
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const [roomId, room] of roomsMap.entries()) {
        if (!room.participants.has(socket.id)) continue;

        const participant = room.participants.get(socket.id);
        room.participants.delete(socket.id);

        if (room.doctorId === socket.id) {
          room.doctorId = null;
          io.to(`${roomId}-waiting`).emit('call:room-status', { hasDoctor: false });
        }
        if (room.patientId === socket.id) room.patientId = null;

        socket.to(roomId).emit('call:ended', { participant });

        if (!room.doctorId && !room.patientId) roomsMap.delete(roomId);
      }

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