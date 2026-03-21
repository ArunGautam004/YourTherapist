import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  answer: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, enum: ['scale', 'choice', 'text', 'objective', 'subjective', 'image'] },
});

const questionnaireResponseSchema = new mongoose.Schema({
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionnaireTemplate' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  responses: [responseSchema],
  totalScore: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('QuestionnaireResponse', questionnaireResponseSchema);
