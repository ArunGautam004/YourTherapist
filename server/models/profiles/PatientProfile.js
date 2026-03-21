import mongoose from 'mongoose';

const patientProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  phone: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  dob: { type: Date },
  profilePic: { type: String, default: '' },
  address: { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical', ''], default: '' },
  diagnosis: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('PatientProfile', patientProfileSchema);
