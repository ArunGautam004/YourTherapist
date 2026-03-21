import Razorpay from 'razorpay';
import crypto from 'crypto';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import DoctorProfile from '../models/profiles/DoctorProfile.js';
import { sendEmail } from '../utils/sendEmail.js';
import { confirmationPatientEmail, confirmationDoctorEmail } from '../utils/emailTemplates.js';
import { createNotification } from '../controllers/notificationController.js';
import { v4 as uuidv4 } from 'uuid';

const IST_OFFSET_MINUTES = 330;

const getISTDateParts = (date) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
};

const getISTDayBoundsInUTC = (date = new Date()) => {
  const { year, month, day } = getISTDateParts(date);
  const startUtcMs = Date.UTC(year, month, day) - IST_OFFSET_MINUTES * 60000;
  const endUtcMs = Date.UTC(year, month, day + 1) - IST_OFFSET_MINUTES * 60000;
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
};

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

let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

function generateTimeSlots(startTime, endTime) {
  const slots = [];
  const parseTime = (t) => {
    const [time, period] = t.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + (m || 0);
  };
  let current = parseTime(startTime);
  const end = parseTime(endTime);
  while (current + 50 <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    slots.push(`${displayH}:${m.toString().padStart(2, '0')} ${period}`);
    current += 60;
  }
  return slots;
}

// Helper: get socket.io instance stored on app
const getIo = (req) => req.app.get('io');

// @desc    Create Razorpay order — appointment stays 'pending' until payment verified
// @route   POST /api/appointments
export const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, time, type } = req.body;

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const doctorProfile = await DoctorProfile.findOne({ user: doctorId }).select('consultationFee chatFee');

    // ── Only PAID appointments block a slot ─────────────────────────────
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existing = await Appointment.findOne({
      doctor: doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      time,
      status: { $nin: ['cancelled', 'no-show'] },
      paymentStatus: 'paid',
    });
    if (existing) return res.status(400).json({ message: 'This time slot is already booked' });

    const fee = type === 'chat'
      ? (doctorProfile?.chatFee ?? doctor.chatFee)
      : (doctorProfile?.consultationFee ?? doctor.consultationFee);

    const razorpayOrder = await getRazorpay().orders.create({
      amount: fee * 100,
      currency: 'INR',
      receipt: `apt_${uuidv4().slice(0, 8)}`,
      notes: { patientId: req.user._id.toString(), doctorId, date, time, type },
    });

    // Create appointment as pending — NOT shown in dashboards yet
    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      date: new Date(date),
      time,
      type,
      fee,
      meetingLink: `/session/${uuidv4()}`,
      status: 'scheduled',
      paymentStatus: 'pending',
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      appointment,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment — confirms appointment + sends all notifications
// @route   POST /api/appointments/verify-payment
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        paymentStatus: 'failed',
        status: 'cancelled',
      });
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'name specialization email')
      .populate('patient', 'name email phone');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.paymentStatus = 'paid';
    appointment.razorpayPaymentId = razorpay_payment_id;
    appointment.razorpaySignature = razorpay_signature;
    await appointment.save();

    const dateStr = new Date(appointment.date).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const baseUrl = getFrontendBaseUrl();
    const joinUrl = `${baseUrl}${appointment.meetingLink}`;

    const aptData = {
      patientName: appointment.patient.name,
      doctorName: appointment.doctor.name,
      dateStr,
      time: appointment.time,
      type: appointment.type,
      fee: appointment.fee,
    };

    const io = getIo(req);

    try {
      await sendEmail({
        to: appointment.patient.email,
        subject: '✅ Appointment Confirmed — YourTherapist',
        htmlContent: confirmationPatientEmail(aptData),
      });
    } catch (e) {
      console.error('Patient confirmation email failed:', e.message);
    }

    try {
      await sendEmail({
        to: appointment.doctor.email,
        subject: '📅 New Appointment Booked — YourTherapist',
        htmlContent: confirmationDoctorEmail(aptData),
      });
    } catch (e) {
      console.error('Doctor confirmation email failed:', e.message);
    }

    try {
      const Message = (await import('../models/Message.js')).default;
      const doctorLabel = formatDoctorLabel(appointment.doctor.name);

      await Message.create({
        sender: appointment.doctor._id,
        receiver: appointment.patient._id,
        text: `Hello ${appointment.patient.name} 👋, your appointment on ${dateStr} at ${appointment.time} has been confirmed. Looking forward to our session!`,
      });

      if (io) {
        io.to(`user:${appointment.patient._id}`).emit('message:receive', {
          sender: appointment.doctor._id,
          senderName: doctorLabel,
          text: `Your appointment on ${dateStr} at ${appointment.time} is confirmed.`,
          createdAt: new Date(),
        });
      }
    } catch (e) {
      console.error('Auto-message failed:', e.message);
    }

    // In-app notifications
    try {
      const patientNotif = await createNotification({
        userId: appointment.patient._id,
        type: 'appointment_confirmed',
        title: '✅ Appointment Confirmed',
        message: `Your appointment with ${formatDoctorLabel(appointment.doctor.name)} on ${dateStr} at ${appointment.time} is confirmed.`,
        link: '/patient/sessions',   // ✅ opens My Sessions, NOT the meeting link
        meta: { appointmentId: appointment._id },
      });
      const doctorNotif = await createNotification({
        userId: appointment.doctor._id,
        type: 'appointment_confirmed',
        title: '📅 New Appointment',
        message: `${appointment.patient.name} booked a session on ${dateStr} at ${appointment.time}.`,
        link: '/admin/calendar',
        meta: { appointmentId: appointment._id },
      });
      if (io) {
        if (patientNotif) io.to(`user:${appointment.patient._id}`).emit('notification:new', patientNotif);
        if (doctorNotif) io.to(`user:${appointment.doctor._id}`).emit('notification:new', doctorNotif);
      }
    } catch (e) {
      console.error('Notification failed:', e.message);
    }

    // Immediate reminder if session starts within 30 minutes
    try {
      const now = new Date();
      const appointmentDateTime = new Date(appointment.date);
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return { h, m };
      };
      const { h, m } = parseTime(appointment.time);
      appointmentDateTime.setHours(h, m, 0, 0);
      const minutesUntil = (appointmentDateTime - now) / 60000;

      if (minutesUntil > 0 && minutesUntil <= 30) {
        try {
          await sendEmail({
            to: appointment.patient.email,
            subject: '⏰ Your Session Starts Soon!',
            htmlContent: `<p>Hi ${appointment.patient.name}, your session with ${formatDoctorLabel(appointment.doctor.name)} starts in ${Math.round(minutesUntil)} minutes. <a href="${joinUrl}">Join here</a></p>`,
          });
        } catch (e) {
          console.error('Immediate reminder email failed:', e.message);
        }

        const immediatePatientNotif = await createNotification({
          userId: appointment.patient._id,
          type: 'appointment_reminder',
          title: '🎥 Your Session is Starting Now',
          message: `Your session with ${formatDoctorLabel(appointment.doctor.name)} is starting. Join now!`,
          link: appointment.meetingLink,
          meta: { appointmentId: appointment._id, joinUrl },
        });

        const immediateDoctorNotif = await createNotification({
          userId: appointment.doctor._id,
          type: 'appointment_reminder',
          title: '🎥 Session Starting Now',
          message: `${appointment.patient.name} just booked and the session is starting now!`,
          link: appointment.meetingLink,
          meta: { appointmentId: appointment._id, joinUrl },
        });

        if (io) {
          if (immediatePatientNotif) io.to(`user:${appointment.patient._id}`).emit('notification:new', immediatePatientNotif);
          if (immediateDoctorNotif) io.to(`user:${appointment.doctor._id}`).emit('notification:new', immediateDoctorNotif);
        }

        appointment.reminderSent = true;
        await appointment.save();
      }
    } catch (e) {
      console.error('Immediate reminder check failed:', e.message);
    }

    res.json({ message: 'Payment verified and appointment confirmed!', appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's appointments — ONLY paid shown in dashboards
// @route   GET /api/appointments
export const getAppointments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'patient') {
      filter.patient = req.user._id;
    } else {
      filter.doctor = req.user._id;
    }

    if (status) filter.status = status;

    // ✅ Only paid appointments appear in dashboards
    filter.paymentStatus = 'paid';

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'name specialization profilePic rating')
      .populate('patient', 'name email phone profilePic')
      .sort({ date: -1, time: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.json({ appointments, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment by MongoDB _id
// @route   GET /api/appointments/:id
export const getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name specialization profilePic email phone')
      .populate('patient', 'name email phone profilePic gender dob');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const isOwner =
      appointment.patient._id.toString() === req.user._id.toString() ||
      appointment.doctor._id.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ message: 'Not authorized' });

    res.json({ appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get appointment by meeting link UUID — used by VideoSession
// @route   GET /api/appointments/by-link/:uuid
export const getAppointmentByLink = async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const meetingLink = `/session/${uuid}`;

    const appointment = await Appointment.findOne({
      meetingLink,
      paymentStatus: 'paid',
    })
      .populate('doctor', 'name specialization profilePic email phone')
      .populate('patient', 'name email phone profilePic gender dob');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const isOwner =
      appointment.patient._id.toString() === req.user._id.toString() ||
      appointment.doctor._id.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ message: 'Not authorized' });

    res.json({ appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id
export const updateAppointment = async (req, res, next) => {
  try {
    const { status, notes, cancelReason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (status) appointment.status = status;
    if (notes) appointment.notes = notes;
    if (cancelReason) appointment.cancelReason = cancelReason;
    await appointment.save();

    const populated = await appointment.populate([
      { path: 'doctor', select: 'name specialization profilePic' },
      { path: 'patient', select: 'name email phone profilePic' },
    ]);

    res.json({ appointment: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's appointments for doctor — only paid
// @route   GET /api/appointments/today
export const getTodayAppointments = async (req, res, next) => {
  try {
    const { start, end } = getISTDayBoundsInUTC(new Date());

    const appointments = await Appointment.find({
      doctor: req.user._id,
      date: { $gte: start, $lt: end },
      status: { $nin: ['cancelled'] },
      paymentStatus: 'paid',
    })
      .populate('patient', 'name email phone profilePic')
      .sort({ time: 1 });

    res.json({ appointments });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available slots for a doctor on a date
// @route   GET /api/appointments/slots/:doctorId/:date
export const getAvailableSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.params;

    const doctor = await User.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const doctorProfile = await DoctorProfile.findOne({ user: doctorId }).select('availableSlots');

    // Parse date as local calendar day to avoid UTC offset drift.
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const requestedDate = new Date(year, month - 1, day);
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });

    const normalizeDay = (value = '') => value.trim().toLowerCase();
    const dayMap = {
      mon: 'monday', tue: 'tuesday', wed: 'wednesday', thu: 'thursday',
      fri: 'friday', sat: 'saturday', sun: 'sunday',
    };
    const requestedDay = normalizeDay(dayOfWeek);

    const sourceSlots = doctorProfile?.availableSlots?.length ? doctorProfile.availableSlots : (doctor.availableSlots || []);

    const dayAvailability = sourceSlots.find((a) => {
      const stored = normalizeDay(a?.day);
      const expanded = dayMap[stored] || stored;
      return expanded === requestedDay;
    });
    if (!dayAvailability) {
      return res.json({ slots: [] });
    }

    const allSlots = generateTimeSlots(dayAvailability.startTime, dayAvailability.endTime);

    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Only paid appointments block slots
    const booked = await Appointment.find({
      doctor: doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $nin: ['cancelled', 'no-show'] },
      paymentStatus: 'paid',
    }).select('time');

    const bookedTimes = new Set(booked.map(a => a.time));
    const availableSlots = allSlots.filter(slot => !bookedTimes.has(slot));

    res.json({ slots: availableSlots });
  } catch (error) {
    next(error);
  }
};