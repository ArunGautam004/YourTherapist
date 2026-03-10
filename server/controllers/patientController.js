import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import SessionNote from '../models/SessionNote.js';
import MoodEntry from '../models/MoodEntry.js';

// @desc    Get all patients for a doctor
// @route   GET /api/patients
export const getPatients = async (req, res, next) => {
  try {
    const { search, riskLevel } = req.query;

    // Get unique patient IDs from appointments
    const appointmentFilter = { doctor: req.user._id };
    const patientIds = await Appointment.distinct('patient', appointmentFilter);

    const userFilter = { _id: { $in: patientIds }, role: 'patient' };
    if (search) {
      userFilter.name = { $regex: search, $options: 'i' };
    }

    const patients = await User.find(userFilter).select('-password');

    // Enrich with session data
    const enriched = await Promise.all(patients.map(async (patient) => {
      const appointments = await Appointment.find({ patient: patient._id, doctor: req.user._id })
        .sort({ date: -1 }).limit(1);

      const sessionCount = await Appointment.countDocuments({
        patient: patient._id, doctor: req.user._id, status: 'completed'
      });

      const latestNote = await SessionNote.findOne({ patient: patient._id, doctor: req.user._id })
        .sort({ createdAt: -1 });

      const recentMoods = await MoodEntry.find({ patient: patient._id })
        .sort({ date: -1 }).limit(7);

      const avgMood = recentMoods.length > 0
        ? (recentMoods.reduce((sum, m) => sum + m.score, 0) / recentMoods.length).toFixed(1)
        : null;

      // Determine mood trend
      let moodTrend = 'stable';
      if (recentMoods.length >= 3) {
        const recent = recentMoods.slice(0, 3).reduce((s, m) => s + m.score, 0) / 3;
        const older = recentMoods.slice(-3).reduce((s, m) => s + m.score, 0) / Math.min(3, recentMoods.length);
        if (recent > older + 0.5) moodTrend = 'up';
        else if (recent < older - 0.5) moodTrend = 'down';
      }

      return {
        ...patient.toJSON(),
        sessions: sessionCount,
        lastSession: appointments[0]?.date || null,
        nextSession: null,
        riskLevel: latestNote?.riskLevel || 'low',
        diagnosis: latestNote?.diagnosis || '',
        moodScore: avgMood ? parseFloat(avgMood) : null,
        moodTrend,
        progressStatus: latestNote?.progressStatus || 'initial',
      };
    }));

    // Filter by risk if needed
    const result = riskLevel && riskLevel !== 'all'
      ? enriched.filter(p => p.riskLevel === riskLevel)
      : enriched;

    res.json({ patients: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient detail with session history
// @route   GET /api/patients/:id
export const getPatientDetail = async (req, res, next) => {
  try {
    const patient = await User.findById(req.params.id).select('-password');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const appointments = await Appointment.find({
      patient: req.params.id,
      doctor: req.user._id,
    }).sort({ date: -1 }).limit(20);

    const sessionNotes = await SessionNote.find({
      patient: req.params.id,
      doctor: req.user._id,
    }).sort({ createdAt: -1 }).limit(10);

    const moodEntries = await MoodEntry.find({ patient: req.params.id })
      .sort({ date: -1 }).limit(30);

    const sessionCount = await Appointment.countDocuments({
      patient: req.params.id, doctor: req.user._id, status: 'completed'
    });

    res.json({ patient, appointments, sessionNotes, moodEntries, sessionCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor analytics
// @route   GET /api/patients/analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const doctorId = req.user._id;

    const totalPatients = await Appointment.distinct('patient', { doctor: doctorId });
    const totalSessions = await Appointment.countDocuments({ doctor: doctorId, status: 'completed' });

    // Monthly data (last 7 months)
    const monthlyData = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const sessions = await Appointment.countDocuments({
        doctor: doctorId, status: 'completed',
        date: { $gte: start, $lt: end },
      });

      const revenue = await Appointment.aggregate([
        { $match: { doctor: doctorId, status: 'completed', date: { $gte: start, $lt: end } } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
      ]);

      const patients = await Appointment.distinct('patient', {
        doctor: doctorId, date: { $gte: start, $lt: end },
      });

      monthlyData.push({
        month: start.toLocaleDateString('en', { month: 'short' }),
        sessions,
        revenue: revenue[0]?.total || 0,
        patients: patients.length,
      });
    }

    // Conditions breakdown from session notes
    const notes = await SessionNote.find({ doctor: doctorId, diagnosis: { $ne: '' } });
    const conditionsMap = {};
    notes.forEach(n => {
      n.diagnosis.split(',').forEach(d => {
        const cond = d.trim();
        if (cond) conditionsMap[cond] = (conditionsMap[cond] || 0) + 1;
      });
    });
    const conditions = Object.entries(conditionsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const totalRev = await Appointment.aggregate([
      { $match: { doctor: doctorId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    res.json({
      totalPatients: totalPatients.length,
      totalSessions,
      totalRevenue: totalRev[0]?.total || 0,
      monthlyData,
      conditions,
    });
  } catch (error) {
    next(error);
  }
};
