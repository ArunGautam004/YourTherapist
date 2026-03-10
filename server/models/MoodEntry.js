import mongoose from 'mongoose';

const moodEntrySchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true, min: 1, max: 10 },
  emoji: { type: String, default: '' },
  label: { type: String, default: '' },
  note: { type: String, default: '' },
  tags: [String],
  date: { type: Date, default: Date.now },
}, { timestamps: true });

moodEntrySchema.index({ patient: 1, date: -1 });

export default mongoose.model('MoodEntry', moodEntrySchema);
