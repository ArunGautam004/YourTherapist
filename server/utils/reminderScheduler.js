import Appointment from '../models/Appointment.js';
import Message from '../models/Message.js';
import { sendEmail } from '../utils/sendEmail.js';
import { reminderEmail } from '../utils/emailTemplates.js';
import { createNotification } from '../controllers/notificationController.js';

const IST_OFFSET_MINUTES = 330;

const getFrontendBaseUrl = () => {
  const direct = process.env.FRONTEND_URL || process.env.CLIENT_URL;
  if (direct) return direct;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:5173';
};

const formatDoctorLabel = (name = '') => {
  const cleanName = String(name).replace(/^dr\.?\s*/i, '').trim();
  return `Dr. ${cleanName}`;
};

const getISTDateParts = (date) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
};

const buildAppointmentDateTimeIST = (dateValue, timeValue) => {
  const baseDate = new Date(dateValue);
  const { year, month, day } = getISTDateParts(baseDate);

  const [timePart, period] = (timeValue || '12:00 PM').split(' ');
  let [h, m] = (timePart || '12:00').split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;

  const utcMs = Date.UTC(year, month, day, h || 0, m || 0) - IST_OFFSET_MINUTES * 60000;
  return new Date(utcMs);
};

/**
 * Call startReminderScheduler(io) once after DB connects in server.js.
 *
 * Usage in server.js:
 *   import { startReminderScheduler } from './utils/reminderScheduler.js';
 *   mongoose.connect(...).then(() => {
 *     const server = app.listen(PORT);
 *     const io = initSocket(server);
 *     startReminderScheduler(io);
 *   });
 *
 * It polls every 60 seconds and finds appointments that:
 *   - are paid
 *   - start in 8–12 minutes from now (window avoids duplicate sends on adjacent ticks)
 *   - haven't had reminderSent = true yet
 */
export const startReminderScheduler = (io) => {
  console.log('⏰ Appointment reminder scheduler started');

  const check = async () => {
    try {
      const now = new Date();

      const candidates = await Appointment.find({
        paymentStatus: 'paid',
        status: { $in: ['scheduled', 'upcoming'] },
        reminderSent: false,
      })
        .populate('patient', 'name email')
        .populate('doctor',  'name email');

      for (const apt of candidates) {
        const aptDate = buildAppointmentDateTimeIST(apt.date, apt.time);
        const minutesUntil = Math.round((aptDate - now) / 60000);

        // Trigger around 10 minutes before start, with tolerance for 60s scheduler interval.
        if (minutesUntil < 8 || minutesUntil > 12) continue;

        const baseUrl = getFrontendBaseUrl();
        const joinUrl  = `${baseUrl}${apt.meetingLink}`;

        const dateStr = new Date(apt.date).toLocaleDateString('en-IN', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        const aptData = {
          patientName: apt.patient.name,
          doctorName:  apt.doctor.name,
          dateStr,
          time: apt.time,
          type: apt.type,
        };

        // 1. Reminder email → patient
        try {
          await sendEmail({
            to: apt.patient.email,
            subject: '⏰ Your Session Starts in 10 Minutes — YourTherapist',
            htmlContent: reminderEmail(aptData, apt.patient.name, joinUrl),
          });
        } catch (e) {
          console.error(`Reminder email to patient failed (${apt._id}):`, e.message);
        }

        // 2. Reminder email → doctor
        try {
          await sendEmail({
            to: apt.doctor.email,
            subject: '⏰ Session Starting in 10 Minutes — YourTherapist',
            htmlContent: reminderEmail(
              aptData,
              formatDoctorLabel(apt.doctor.name),
              joinUrl
            ),
          });
        } catch (e) {
          console.error(`Reminder email to doctor failed (${apt._id}):`, e.message);
        }

        // 3. Send meeting link in direct chat so patient can open it quickly.
        try {
          if (apt.meetingLink) {
            const alreadySent = await Message.findOne({
              sender: apt.doctor._id,
              receiver: apt.patient._id,
              text: { $regex: apt.meetingLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
              createdAt: { $gte: new Date(now.getTime() - 20 * 60 * 1000) },
            });

            if (!alreadySent) {
              const chatMessage = await Message.create({
                sender: apt.doctor._id,
                receiver: apt.patient._id,
                text: `Your session starts in 10 minutes. Join here: ${joinUrl}`,
              });

              if (io) {
                io.to(`user:${apt.patient._id}`).emit('message:receive', {
                  _id: chatMessage._id,
                  sender: apt.doctor._id,
                  senderName: formatDoctorLabel(apt.doctor.name),
                  receiver: apt.patient._id,
                  text: chatMessage.text,
                  createdAt: chatMessage.createdAt,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Meeting link chat message failed (${apt._id}):`, e.message);
        }

        // 4. In-app notification → patient (with join link in meta)
        const patientNotif = await createNotification({
          userId: apt.patient._id,
          type:   'appointment_reminder',
          title:  '⏰ Session in 10 Minutes',
          message: `Your session with ${formatDoctorLabel(apt.doctor.name)} starts in 10 minutes.`,
          link:   apt.meetingLink,
          meta:   { appointmentId: apt._id, joinUrl },
        });

        // 5. In-app notification → doctor
        const doctorNotif = await createNotification({
          userId: apt.doctor._id,
          type:   'appointment_reminder',
          title:  '⏰ Session in 10 Minutes',
          message: `Your session with ${apt.patient.name} starts in 10 minutes.`,
          link:   apt.meetingLink,
          meta:   { appointmentId: apt._id, joinUrl },
        });

        // 6. Push via socket if user is online
        if (io) {
          if (patientNotif) io.to(`user:${apt.patient._id}`).emit('notification:new', patientNotif);
          if (doctorNotif)  io.to(`user:${apt.doctor._id}`).emit('notification:new', doctorNotif);
        }

        // Mark done so we never send twice
        apt.reminderSent = true;
        await apt.save();

        console.log(`✅ Reminder sent for appointment ${apt._id}`);
      }
    } catch (err) {
      console.error('Reminder scheduler error:', err.message);
    }
  };

  check(); // run immediately on startup
  setInterval(check, 60 * 1000); // then every 60 seconds
};