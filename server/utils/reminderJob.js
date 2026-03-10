import Appointment from '../models/Appointment.js';
import { sendEmail } from './sendEmail.js';

/**
 * Check every 60 seconds for appointments starting in the next 5 minutes.
 * Send a reminder email to the patient.
 */
export const startReminderJob = () => {
  console.log('⏰ Appointment reminder job started');

  setInterval(async () => {
    try {
      const now = new Date();
      const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);

      // Find appointments within the next 5 minutes that haven't been reminded
      const appointments = await Appointment.find({
        status: { $in: ['scheduled', 'upcoming'] },
        paymentStatus: 'paid',
        reminderSent: false,
      })
        .populate('patient', 'name email')
        .populate('doctor', 'name');

      for (const apt of appointments) {
        // Parse appointment datetime
        const aptDate = new Date(apt.date);
        const [time, period] = apt.time.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        aptDate.setHours(h, m || 0, 0, 0);

        // Check if appointment is within the next 5 minutes
        if (aptDate >= now && aptDate <= fiveMinLater) {
          try {
            await sendEmail({
              to: apt.patient.email,
              subject: '⏰ Reminder: Your session starts in 5 minutes!',
              htmlContent: `
                <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8faf9;border-radius:16px;">
                  <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="color:#0d6b5e;font-size:24px;">YourTherapist</h1>
                  </div>
                  <div style="background:white;border-radius:12px;padding:24px;text-align:center;">
                    <p style="font-size:48px;margin:0;">⏰</p>
                    <h2 style="color:#333;margin:12px 0 8px;">Session Starting Soon!</h2>
                    <p style="color:#666;font-size:14px;">Hello <strong>${apt.patient.name}</strong>, your session with <strong>Dr. ${apt.doctor.name}</strong> starts in 5 minutes.</p>
                    <div style="margin:20px 0;">
                      <a href="${process.env.CLIENT_URL}${apt.meetingLink}" style="display:inline-block;background:#0d6b5e;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
                        Join Session →
                      </a>
                    </div>
                    <p style="color:#999;font-size:12px;">Make sure your camera and microphone are working.</p>
                  </div>
                </div>
              `,
            });
            apt.reminderSent = true;
            await apt.save();
            console.log(`⏰ Reminder sent to ${apt.patient.email} for appointment at ${apt.time}`);
          } catch (emailErr) {
            console.error(`⚠️ Reminder email failed for ${apt.patient.email}:`, emailErr.message);
          }
        }
      }
    } catch (err) {
      console.error('❌ Reminder job error:', err.message);
    }
  }, 60 * 1000); // Check every minute
};
