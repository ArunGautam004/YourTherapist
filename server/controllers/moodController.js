import MoodEntry from '../models/MoodEntry.js';

// @desc    Create or update mood entry (upsert for same day)
// @route   POST /api/mood
export const createMoodEntry = async (req, res, next) => {
  try {
    const { score, emoji, label, note, tags } = req.body;

    // Check if an entry already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await MoodEntry.findOne({
      patient: req.user._id,
      date: { $gte: today, $lt: tomorrow },
    });

    if (existing) {
      // Update existing entry
      existing.score = score;
      existing.emoji = emoji;
      existing.label = label;
      existing.note = note;
      existing.tags = tags || [];
      await existing.save();
      return res.json({ entry: existing, updated: true });
    }

    // Create new entry
    const entry = await MoodEntry.create({
      patient: req.user._id,
      score, emoji, label, note,
      tags: tags || [],
      date: new Date(),
    });

    res.status(201).json({ entry, updated: false });
  } catch (error) {
    next(error);
  }
};

// @desc    Get mood entries
// @route   GET /api/mood
export const getMoodEntries = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const entries = await MoodEntry.find({
      patient: req.user._id,
      date: { $gte: since },
    }).sort({ date: -1 });

    // Calculate stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeek = entries.filter(e => e.date >= weekAgo);
    const lastWeek = entries.filter(e => e.date >= twoWeeksAgo && e.date < weekAgo);

    const avgThis = thisWeek.length ? (thisWeek.reduce((s, e) => s + e.score, 0) / thisWeek.length) : 0;
    const avgLast = lastWeek.length ? (lastWeek.reduce((s, e) => s + e.score, 0) / lastWeek.length) : 0;

    const changePercent = avgLast > 0 ? Math.round(((avgThis - avgLast) / avgLast) * 100) : 0;

    // Streak calculation
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const dayCheck = new Date(today);
      dayCheck.setDate(dayCheck.getDate() - i);
      const nextDay = new Date(dayCheck);
      nextDay.setDate(nextDay.getDate() + 1);
      const hasEntry = entries.some(e => e.date >= dayCheck && e.date < nextDay);
      if (hasEntry) streak++;
      else break;
    }

    res.json({
      entries,
      stats: {
        avgMood: avgThis.toFixed(1),
        changePercent,
        totalEntries: entries.length,
        streak,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete mood entry
// @route   DELETE /api/mood/:id
export const deleteMoodEntry = async (req, res, next) => {
  try {
    const entry = await MoodEntry.findOneAndDelete({
      _id: req.params.id,
      patient: req.user._id,
    });

    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    res.json({ message: 'Entry deleted' });
  } catch (error) {
    next(error);
  }
};
