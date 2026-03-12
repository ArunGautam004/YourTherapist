import Appointment from '../models/Appointment.js';
import { sendEmail } from '../utils/sendEmail.js';
import { reminderEmail } from '../utils/emailTemplates.js';
import { createNotification } from '../controllers/notificationController.js';

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
      // Window: 8 to 12 minutes from now
      const windowStart = new Date(now.getTime() + 8 * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + 12 * 60 * 1000);

      const candidates = await Appointment.find({
        paymentStatus: 'paid',
        status: { $in: ['scheduled', 'upcoming'] },
        reminderSent: false,
      })
        .populate('patient', 'name email')
        .populate('doctor',  'name email');

      for (const apt of candidates) {
        // Reconstruct exact start datetime from stored date + time string (e.g. "3:00 PM")
        const aptDate = new Date(apt.date);
        const [timePart, period] = (apt.time || '').split(' ');
        let [h, m] = (timePart || '0:0').split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        aptDate.setHours(h, m || 0, 0, 0);

        if (aptDate < windowStart || aptDate > windowEnd) continue;

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
              apt.doctor.name.startsWith('Dr.') ? apt.doctor.name : `Dr. ${apt.doctor.name}`,
              joinUrl
            ),
          });
        } catch (e) {
          console.error(`Reminder email to doctor failed (${apt._id}):`, e.message);
        }

        // 3. In-app notification → patient (with join link in meta)
        const patientNotif = await createNotification({
          userId: apt.patient._id,
          type:   'appointment_reminder',
          title:  '⏰ Session in 10 Minutes',
          message: `Your session with Dr. ${apt.doctor.name} starts in 10 minutes.`,
          link:   apt.meetingLink,
          meta:   { appointmentId: apt._id, joinUrl },
        });

        // 4. In-app notification → doctor
        const doctorNotif = await createNotification({
          userId: apt.doctor._id,
          type:   'appointment_reminder',
          title:  '⏰ Session in 10 Minutes',
          message: `Your session with ${apt.patient.name} starts in 10 minutes.`,
          link:   apt.meetingLink,
          meta:   { appointmentId: apt._id, joinUrl },
        });

        // 5. Push via socket if user is online
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