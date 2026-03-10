import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = (userId) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    socket.emit('user:online', userId);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
