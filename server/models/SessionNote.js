import mongoose from 'mongoose';

const sessionNoteSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // SOAP format
  subjective: { type: String, default: '' },
  objective: { type: String, default: '' },
  assessment: { type: String, default: '' },
  plan: { type: String, default: '' },
  diagnosis: { type: String, default: '' },
  sessionDescription: { type: String, default: '' },
  report: { type: String, default: '' },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  moodRating: { type: Number, min: 1, max: 10 },
  progressStatus: { type: String, enum: ['improving', 'stable', 'declining', 'initial'], default: 'initial' },
  homework: [{ task: String, completed: { type: Boolean, default: false } }],
  isSharedWithPatient: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('SessionNote', sessionNoteSchema);
