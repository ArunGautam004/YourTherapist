import Message from '../models/Message.js';
import Appointment from '../models/Appointment.js';
import { createNotification } from '../controllers/notificationController.js';

const onlineUsers = new Map(); // userId -> socketId
const roomsMap = new Map();    // roomId -> { doctorId, patientId, participants }

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── USER ONLINE ──────────────────────────────────────────────────────
    socket.on('user:online', (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
      io.emit('user:status', { userId, online: true });
      console.log(`👤 User online: ${userId}`);
    });

    // ── DM MESSAGING ────────────────────────────────────────────────────
    // ✅ FIX: Do NOT save message here — frontend already calls POST /api/messages.
    // Socket is only for real-time delivery, not DB persistence.
    // This prevents double-save (API + socket both creating a Message doc).
    // message:send socket event — real-time delivery is now handled server-side
    // in the sendMessage controller via io.to('user:receiverId').emit('message:receive')
    // This handler is kept only for legacy compatibility but does NOT re-deliver
    // to avoid the double-message bug.
    socket.on('message:send', async (data) => {
      // No-op: delivery already done by API controller
      // Kept to avoid client-side errors for clients that still emit this event
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
    socket.on('call:join-room', async ({ roomId, role, userId, name }) => {
      // ✅ Check session time window — only allow joining 10 min before to session end
      try {
        const apt = await Appointment.findOne({ meetingLink: `/session/${roomId}`, paymentStatus: 'paid' });
        if (apt) {
          const aptDate = new Date(apt.date);
          const [tPart, tPeriod] = (apt.time || '').split(' ');
          let [tH, tM] = (tPart || '0:0').split(':').map(Number);
          if (tPeriod === 'PM' && tH !== 12) tH += 12;
          if (tPeriod === 'AM' && tH === 12) tH = 0;
          aptDate.setHours(tH, tM || 0, 0, 0);

          const endTime = new Date(aptDate.getTime() + (apt.duration || 50) * 60000);
          const now = new Date();
          const minsUntil = (aptDate - now) / 60000;

          // Outside window: more than 10 min early OR after session ended
          if (minsUntil > 10 || now > endTime) {
            socket.emit('call:access-denied', {
              reason: minsUntil > 10
                ? `Session starts in ${Math.ceil(minsUntil)} minutes. Join link becomes active 10 minutes before.`
                : 'This session has ended.',
            });
            return;
          }
        }
      } catch (err) {
        console.error('Session time check error:', err);
        // Allow join if check fails — don't block
      }

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