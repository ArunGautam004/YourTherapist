import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  endTime: { type: String, default: '' },
  duration: { type: Number, default: 50 }, // minutes
  type: { type: String, enum: ['video', 'chat'], default: 'video' },
  status: { type: String, enum: ['scheduled', 'upcoming', 'in-progress', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
  meetingLink: { type: String, default: '' },
  fee: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  notes: { type: String, default: '' },
  cancelReason: { type: String, default: '' },
  reminderSent: { type: Boolean, default: false },
  patientJoined: { type: Boolean, default: false },
}, { timestamps: true });

appointmentSchema.index({ patient: 1, date: -1 });
appointmentSchema.index({ doctor: 1, date: -1 });

export default mongoose.model('Appointment', appointmentSchema);
