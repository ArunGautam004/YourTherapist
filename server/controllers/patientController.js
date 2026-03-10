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
        patient: patient._id, doctor: req.user._id, status: { $ne: 'cancelled' }
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
      status: { $ne: 'cancelled' }
    }).sort({ date: -1, time: -1 });

    const sessionNotes = await SessionNote.find({
      patient: req.params.id,
      doctor: req.user._id,
    }).sort({ createdAt: -1 }).limit(10);

    const moodEntries = await MoodEntry.find({ patient: req.params.id })
      .sort({ date: -1 }).limit(30);

    const sessionCount = appointments.length;

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

    const totalPatients = await Appointment.distinct('patient', {
      doctor: doctorId,
      status: { $nin: ['cancelled'] }
    });
    const totalSessions = await Appointment.countDocuments({
      doctor: doctorId,
      status: { $nin: ['cancelled'] }
    });

    const totalRev = await Appointment.aggregate([
      { $match: { doctor: doctorId, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    // Revenue Breakdown (UTC aligned)
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()));

    const completedRevenueData = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          paymentStatus: 'paid',
          $or: [
            { status: 'completed' },
            { date: { $lt: todayUTC } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    const pendingRevenueData = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          paymentStatus: 'paid',
          status: { $nin: ['completed', 'cancelled'] },
          date: { $gte: todayUTC }
        }
      },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    // Revenue Today (UTC aligned for standard Date storage)
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const completedRevTodayData = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          paymentStatus: 'paid',
          date: { $gte: todayStart, $lt: todayEnd },
          $or: [
            { status: 'completed' },
            { date: { $lt: todayUTC } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    const pendingRevTodayData = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          paymentStatus: 'paid',
          $and: [
            { date: { $gte: todayStart, $lt: todayEnd } },
            { date: { $gte: todayUTC } }
          ],
          status: { $nin: ['completed', 'cancelled'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    const revToday = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          paymentStatus: 'paid',
          date: { $gte: todayStart, $lt: todayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    const completedSessionsCount = await Appointment.countDocuments({
      doctor: doctorId,
      status: { $nin: ['cancelled'] },
      $or: [
        { status: 'completed' },
        { date: { $lt: todayEnd } }
      ]
    });

    const upcomingSessionsCount = await Appointment.countDocuments({
      doctor: doctorId,
      status: { $nin: ['completed', 'cancelled'] },
      date: { $gte: todayEnd }
    });

    // Daily Data (last 7 days for the new chart)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setUTCDate(d.getUTCDate() - i);
      const nD = new Date(d);
      nD.setUTCDate(nD.getUTCDate() + 1);

      const dayRev = await Appointment.aggregate([
        { $match: { doctor: doctorId, paymentStatus: 'paid', date: { $gte: d, $lt: nD } } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
      ]);
      const dayOrders = await Appointment.countDocuments({
        doctor: doctorId, status: { $nin: ['cancelled'] }, date: { $gte: d, $lt: nD }
      });

      dailyData.push({
        date: d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
        revenue: dayRev[0]?.total || 0,
        orders: dayOrders,
      });
    }

    // Monthly data (last 7 months)
    const monthlyData = [];
    for (let i = 6; i >= 0; i--) {
      const startM = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const endM = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));

      const sessions = await Appointment.countDocuments({
        doctor: doctorId,
        status: { $nin: ['cancelled'] },
        date: { $gte: startM, $lt: endM },
      });

      const revenueMonth = await Appointment.aggregate([
        { $match: { doctor: doctorId, paymentStatus: 'paid', date: { $gte: startM, $lt: endM } } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
      ]);

      const patientsMonth = await Appointment.distinct('patient', {
        doctor: doctorId,
        status: { $nin: ['cancelled'] },
        date: { $gte: startM, $lt: endM },
      });

      monthlyData.push({
        month: startM.toLocaleDateString('en', { month: 'short' }),
        sessions,
        revenue: revenueMonth[0]?.total || 0,
        patients: patientsMonth.length,
      });
    }

    res.json({
      totalPatients: totalPatients.length,
      totalSessions,
      totalRevenue: totalRev[0]?.total || 0,
      completedRevenue: completedRevenueData[0]?.total || 0,
      pendingRevenue: pendingRevenueData[0]?.total || 0,
      totalRevenueToday: revToday[0]?.total || 0,
      completedRevenueToday: completedRevTodayData[0]?.total || 0,
      pendingRevenueToday: pendingRevTodayData[0]?.total || 0,
      completedSessions: completedSessionsCount,
      upcomingSessions: upcomingSessionsCount,
      dailyData,
      monthlyData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Patient Risk and Diagnosis
// @route   PUT /api/patients/:id
export const updatePatientInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { riskLevel, diagnosis } = req.body;

    const patient = await User.findById(id);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (riskLevel !== undefined) patient.riskLevel = riskLevel;
    if (diagnosis !== undefined) patient.diagnosis = diagnosis;

    await patient.save();

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};
