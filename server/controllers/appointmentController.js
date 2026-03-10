import Razorpay from 'razorpay';
import crypto from 'crypto';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { v4 as uuidv4 } from 'uuid';

// Lazy-initialize Razorpay (avoids crash with placeholder keys)
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

// Helper: generate time slots from doctor's available slot range
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

  while (current + 50 <= end) { // 50-min sessions
    const h = Math.floor(current / 60);
    const m = current % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    slots.push(`${displayH}:${m.toString().padStart(2, '0')} ${period}`);
    current += 60; // 1 hour gap between slots
  }

  return slots;
}

// @desc    Create Razorpay order for appointment
// @route   POST /api/appointments
export const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, time, type } = req.body;

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Check for time conflicts
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existing = await Appointment.findOne({
      doctor: doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      time,
      status: { $nin: ['cancelled', 'no-show'] },
    });
    if (existing) return res.status(400).json({ message: 'This time slot is already booked' });

    const fee = type === 'chat' ? doctor.chatFee : doctor.consultationFee;

    // Create Razorpay order
    const razorpayOrder = await getRazorpay().orders.create({
      amount: fee * 100, // Razorpay uses paise
      currency: 'INR',
      receipt: `apt_${uuidv4().slice(0, 8)}`,
      notes: {
        patientId: req.user._id.toString(),
        doctorId: doctorId,
        date,
        time,
        type,
      },
    });

    // Create appointment with pending payment
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

// @desc    Verify Razorpay payment
// @route   POST /api/appointments/verify-payment
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'name specialization email')
      .populate('patient', 'name email phone');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.paymentStatus = 'paid';
    appointment.razorpayPaymentId = razorpay_payment_id;
    appointment.razorpaySignature = razorpay_signature;
    await appointment.save();

    // Send confirmation email to patient
    try {
      const dateStr = new Date(appointment.date).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      await sendEmail({
        to: appointment.patient.email,
        subject: '✅ Appointment Confirmed — YourTherapist',
        htmlContent: `
          <div style="font-family:'Inter',Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#f8faf9;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="color:#0d6b5e;font-size:24px;">YourTherapist</h1>
              <p style="color:#666;">Appointment Confirmed! 🎉</p>
            </div>
            <div style="background:white;border-radius:12px;padding:24px;">
              <p style="color:#333;font-size:16px;">Hello <strong>${appointment.patient.name}</strong>,</p>
              <p style="color:#666;font-size:14px;">Your appointment has been successfully booked and paid.</p>
              <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:16px 0;">
                <table style="width:100%;font-size:14px;color:#333;">
                  <tr><td style="padding:6px 0;color:#666;">Doctor</td><td style="padding:6px 0;font-weight:bold;">Dr. ${appointment.doctor.name}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Date</td><td style="padding:6px 0;font-weight:bold;">${dateStr}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Time</td><td style="padding:6px 0;font-weight:bold;">${appointment.time}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Type</td><td style="padding:6px 0;font-weight:bold;text-transform:capitalize;">${appointment.type}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Fee</td><td style="padding:6px 0;font-weight:bold;">₹${appointment.fee}</td></tr>
                </table>
              </div>
              <p style="color:#999;font-size:12px;">You will receive a reminder email 5 minutes before your session. Please be ready on time.</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('⚠️ Confirmation email failed:', emailErr.message);
    }

    // Send welcome message from doctor to create the conversation
    const Message = (await import('../models/Message.js')).default;
    const existingConvo = await Message.findOne({
      $or: [
        { sender: appointment.doctor._id, receiver: appointment.patient._id },
        { sender: appointment.patient._id, receiver: appointment.doctor._id },
      ],
    });

    if (!existingConvo) {
      await Message.create({
        sender: appointment.doctor._id,
        receiver: appointment.patient._id,
        text: `Hello ${appointment.patient.name}! Your appointment is confirmed for ${new Date(appointment.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at ${appointment.time}. Feel free to message me if you have any questions before our session. 😊`,
      });
    }

    res.json({ message: 'Payment verified and appointment confirmed!', appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's appointments
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
    // Only show paid appointments (or include pending for the user who just booked)
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

// @desc    Get single appointment
// @route   GET /api/appointments/:id
export const getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name specialization profilePic email phone')
      .populate('patient', 'name email phone profilePic gender dob');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const isOwner = appointment.patient._id.toString() === req.user._id.toString() ||
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

// @desc    Get today's appointments for doctor
// @route   GET /api/appointments/today
export const getTodayAppointments = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      doctor: req.user._id,
      date: { $gte: today, $lt: tomorrow },
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

    // Parse date string (YYYY-MM-DD) without UTC offset issues
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day); // Local timezone
    const dayOfWeek = parsedDate.toLocaleDateString('en', { weekday: 'long' });

    // Get doctor's availability for this day
    const daySlot = doctor.availableSlots?.find(s => s.day === dayOfWeek);

    let allSlots = [];
    if (daySlot) {
      allSlots = generateTimeSlots(daySlot.startTime, daySlot.endTime);
    }

    // Find booked slots
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const booked = await Appointment.find({
      doctor: doctorId,
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $nin: ['cancelled', 'no-show'] },
      paymentStatus: 'paid',
    }).select('time');

    const bookedTimes = booked.map(a => a.time);

    const slots = allSlots.map(time => ({
      time,
      available: !bookedTimes.includes(time),
    }));

    res.json({
      slots,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        rating: doctor.rating,
        totalReviews: doctor.totalReviews,
        consultationFee: doctor.consultationFee,
        chatFee: doctor.chatFee,
        bio: doctor.bio,
        profilePic: doctor.profilePic,
      },
    });
  } catch (error) {
    next(error);
  }
};
