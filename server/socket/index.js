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
    socket.on('call:join-room', (roomId) => {
      socket.join(roomId);
      const room = io.sockets.adapter.rooms.get(roomId);
      const numClients = room ? room.size : 0;
      console.log(`📹 User joined room ${roomId} (${numClients} in room)`);

      if (numClients === 1) {
        socket.emit('call:waiting');
      } else if (numClients === 2) {
        io.to(roomId).emit('call:ready');
      }
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
