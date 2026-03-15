import Message from '../models/Message.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

// @desc    Get conversations list
// @route   GET /api/messages/conversations
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get unique conversation partners
    const sent = await Message.distinct('receiver', { sender: userId });
    const received = await Message.distinct('sender', { receiver: userId });
    const partnerIds = [...new Set([...sent.map(String), ...received.map(String)])];

    const conversations = await Promise.all(partnerIds.map(async (partnerId) => {
      const partner = await User.findById(partnerId).select('name role profilePic specialization');

      const lastMessage = await Message.findOne({
        $or: [
          { sender: userId, receiver: partnerId },
          { sender: partnerId, receiver: userId },
        ],
      }).sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        sender: partnerId, receiver: userId, read: false,
      });

      return {
        partner,
        lastMessage,
        unreadCount,
      };
    }));

    // Sort by most recent message
    conversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || 0;
      const dateB = b.lastMessage?.createdAt || 0;
      return new Date(dateB) - new Date(dateA);
    });

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages with a user
// @route   GET /api/messages/:userId
export const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mark as read
    await Message.updateMany(
      { sender: userId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/messages
export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, text } = req.body;

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text,
    });

    // ✅ Server-side real-time delivery to receiver only
    // This replaces the frontend socket.emit('message:send') pattern
    // which caused double messages when the sender's own listener fired.
    const io = req.app.get('io');
    if (io) {
      const senderName = req.user.name?.startsWith('Dr.')
        ? req.user.name
        : req.user.role === 'doctor' || req.user.role === 'admin'
          ? `Dr. ${req.user.name}`
          : req.user.name;

      io.to(`user:${receiverId}`).emit('message:receive', {
        _id: message._id.toString(),
        sender: req.user._id.toString(),
        receiver: receiverId,
        text,
        senderName,
        createdAt: message.createdAt,
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:senderId
export const markAsRead = async (req, res, next) => {
  try {
    const { senderId } = req.params;

    await Message.updateMany(
      { sender: senderId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Contact form submission — forwards to doctor email
// @route   POST /api/contact  (public, no auth required)
export const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email and message are required' });
    }

    const DOCTOR_EMAIL = process.env.DOCTOR_EMAIL || 'doctor@yourtherapist.com';

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #0d6b5e; margin-bottom: 4px;">📬 New Contact Form Submission</h2>
        <p style="color: #666; font-size: 13px; margin-bottom: 24px;">From <strong>YourTherapist.com</strong> Contact Page</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #888; width: 100px;">Name</td><td style="padding: 8px 0; font-weight: 600; color: #222;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0; color: #222;"><a href="mailto:${email}">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding: 8px 0; color: #888;">Phone</td><td style="padding: 8px 0; color: #222;">${phone}</td></tr>` : ''}
          ${subject ? `<tr><td style="padding: 8px 0; color: #888;">Subject</td><td style="padding: 8px 0; color: #222;">${subject}</td></tr>` : ''}
        </table>

        <div style="margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #0d6b5e;">
          <p style="color: #888; font-size: 12px; margin-bottom: 8px;">Message</p>
          <p style="color: #222; white-space: pre-wrap; margin: 0;">${message}</p>
        </div>

        <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Submitted on ${new Date().toLocaleString('en-IN')}</p>
      </div>
    `;

    await sendEmail({
      to: DOCTOR_EMAIL,
      subject: `📬 Contact Form: ${subject || 'General Inquiry'} — from ${name}`,
      htmlContent,
    });

    // Also send acknowledgment to the person
    await sendEmail({
      to: email,
      subject: '✅ We received your message — YourTherapist',
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px;">
          <h2 style="color: #0d6b5e;">Hi ${name},</h2>
          <p>Thank you for reaching out to YourTherapist. We've received your message and will get back to you within 24 hours.</p>
          <p style="color: #666;">Your message: <em>"${message.slice(0, 200)}${message.length > 200 ? '...' : ''}"</em></p>
          <p>Best regards,<br/><strong>YourTherapist Team</strong></p>
        </div>
      `,
    });

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Doctor sends a beautiful email to a patient
// @route   POST /api/messages/email-patient
export const sendEmailToPatient = async (req, res, next) => {
  try {
    const { patientId, description } = req.body;

    if (!patientId || !description?.trim()) {
      return res.status(400).json({ message: 'Patient and description are required' });
    }

    const patient = await User.findById(patientId).select('name email');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const doctor = req.user;
    const doctorName = doctor.name?.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`;
    const now = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"/></head>
      <body style="margin:0;padding:0;background:#f4f7f6;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#0d6b5e 0%,#10a88e 100%);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">YourTherapist</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Professional Mental Health Care</p>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding:36px 40px 0;">
                  <p style="margin:0;color:#1a1a1a;font-size:20px;font-weight:600;">Hello, ${patient.name} 👋</p>
                  <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">You have a new message from your therapist.</p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:24px 40px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/></td></tr>

              <!-- Message from doctor -->
              <tr>
                <td style="padding:24px 40px;">
                  <p style="margin:0 0 12px;color:#374151;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Message from ${doctorName}</p>
                  <div style="background:#f0fdf8;border-left:4px solid #0d6b5e;border-radius:0 8px 8px 0;padding:20px 24px;">
                    <p style="margin:0;color:#1a1a1a;font-size:15px;line-height:1.7;white-space:pre-wrap;">${description.trim()}</p>
                  </div>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/></td></tr>

              <!-- Footer info -->
              <tr>
                <td style="padding:24px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#f9fafb;border-radius:10px;padding:16px 20px;">
                        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Your Therapist</p>
                        <p style="margin:0;color:#1a1a1a;font-size:14px;font-weight:600;">${doctorName}</p>
                        ${doctor.specialization ? `<p style="margin:4px 0 0;color:#0d6b5e;font-size:12px;">${doctor.specialization}</p>` : ''}
                      </td>
                      <td width="20"></td>
                      <td style="background:#f9fafb;border-radius:10px;padding:16px 20px;">
                        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Date Sent</p>
                        <p style="margin:0;color:#1a1a1a;font-size:14px;font-weight:600;">${now}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding:0 40px 32px;text-align:center;">
                  <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">If you have any questions, log in to your account to reply directly.</p>
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/messages"
                     style="display:inline-block;background:linear-gradient(135deg,#0d6b5e,#10a88e);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
                    Open Messages →
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} YourTherapist · This email was sent by your registered therapist.</p>
                  <p style="margin:6px 0 0;color:#9ca3af;font-size:11px;">Please do not reply to this automated email. Use the Messages section in your dashboard.</p>
                </td>
              </tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    await sendEmail({
      to: patient.email,
      subject: `📩 Message from ${doctorName} — YourTherapist`,
      htmlContent,
    });

    res.json({ success: true, message: `Email sent to ${patient.name}` });
  } catch (error) {
    next(error);
  }
};