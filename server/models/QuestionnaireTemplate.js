import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['scale', 'choice', 'text'], required: true },
  options: [String],
  required: { type: Boolean, default: true },
});

const questionnaireTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [questionSchema],
  category: { type: String, enum: ['check-in', 'assessment', 'feedback', 'custom'], default: 'custom' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('QuestionnaireTemplate', questionnaireTemplateSchema);
