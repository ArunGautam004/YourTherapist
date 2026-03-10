import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import initSocket from './socket/index.js';

// Route imports
import authRoutes from './routes/auth.js';
import appointmentRoutes from './routes/appointments.js';
import doctorRoutes from './routes/doctors.js';
import patientRoutes from './routes/patients.js';
import moodRoutes from './routes/mood.js';
import messageRoutes from './routes/messages.js';
import sessionRoutes from './routes/sessions.js';
import { startReminderJob } from './utils/reminderJob.js';

// Load env
dotenv.config();

// Connect DB
connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins for local development tests
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocket(io);

// Middleware
app.use(cors({
  origin: true, // Allow all origins for local development tests
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌐 CORS: ${process.env.CLIENT_URL || 'http://localhost:5174'}`);
  startReminderJob();
});
