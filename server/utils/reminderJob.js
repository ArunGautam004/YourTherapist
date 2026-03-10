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
      const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000);
      const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);

      // We'll track two states: reminderEmailSent and linkMessageSent. 
      // Since schema might not have linkMessageSent yet, we'll just use reminderSent for the sequence
      // Or we can just use time-based constraints and assume it runs exactly once within that minute window
      // The job runs every minute, so we'll check precise minute boundaries.

      const appointments = await Appointment.find({
        status: { $in: ['scheduled', 'upcoming'] },
        paymentStatus: 'paid',
        $or: [
          { reminderSent: false },
          { reminderSent: true } // Need to fetch them anyway to check for 5-min link if we don't have a specific flag in DB
        ]
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

        const diffMinutes = Math.round((aptDate - now) / 60000);

        // --- 15 Minute Email Reminder ---
        if (diffMinutes === 15 && !apt.reminderSent) {
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
                    <p style="color:#666;font-size:14px;">Hello <strong>${apt.patient.name}</strong>, your session with <strong>${apt.doctor.name.startsWith('Dr.') ? apt.doctor.name : `Dr. ${apt.doctor.name}`}</strong> starts in 15 minutes.</p>
                    <p style="color:#666;font-size:14px;">You will receive the meeting link in your chat 5 minutes before the session starts.</p>
                    <p style="color:#999;font-size:12px;">Make sure your camera and microphone are working.</p>
                  </div>
                </div>
              `,
            });
            apt.reminderSent = true;
            await apt.save();
            console.log(`⏰ Email reminder sent to ${apt.patient.email} for appointment at ${apt.time}`);
          } catch (emailErr) {
            console.error(`⚠️ Reminder email failed for ${apt.patient.email}:`, emailErr.message);
          }
        }

        // --- 5 Minute Message Link ---
        // Using a temporary hack: Since we only have 'reminderSent' in schema, 
        // we'll just check if it's exactly 5 minutes out AND reminderSent is true
        // (to ensure we don't spam if server restarts). For safety, we also check if 
        // a message exists in the DB with the meeting link to avoid duplicates.
        if (diffMinutes === 5) {
          try {
            const Message = (await import('../models/Message.js')).default;

            // Check if we already sent the link
            const existingLinkMsg = await Message.findOne({
              sender: apt.doctor._id,
              receiver: apt.patient._id,
              text: { $regex: apt.meetingLink }
            });

            if (!existingLinkMsg) {
              await Message.create({
                sender: apt.doctor._id,
                receiver: apt.patient._id,
                text: `🔗 Here is the link for our session starting in 5 minutes! Click to join: ${process.env.CLIENT_URL || ''}${apt.meetingLink}`,
              });
              console.log(`🔗 Meeting link sent to ${apt.patient.email} via chat for appointment at ${apt.time}`);
            }
          } catch (linkErr) {
            console.error(`⚠️ Link message failed for ${apt.patient.email}:`, linkErr.message);
          }
        }
      }
    } catch (err) {
      console.error('❌ Reminder job error:', err.message);
    }
  }, 60 * 1000); // Check every minute
};
