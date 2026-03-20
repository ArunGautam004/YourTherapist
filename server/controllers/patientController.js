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
    const appointmentFilter = { doctor: req.user._id, paymentStatus: 'paid' };
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
        patient: patient._id, doctor: req.user._id, paymentStatus: 'paid', status: { $ne: 'cancelled' }
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

      const patientJson = patient.toJSON();
      // Prefer User model values (set by doctor via update API)
      // Fall back to latest session note if User value is blank
      const riskLevel = patientJson.riskLevel || latestNote?.riskLevel || 'low';
      const diagnosis = patientJson.diagnosis || latestNote?.diagnosis || '';

      return {
        ...patientJson,
        sessions: sessionCount,
        lastSession: appointments[0]?.date || null,
        nextSession: null,
        riskLevel,
        diagnosis,
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
      paymentStatus: 'paid',
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

// @desc    Get ALL patients registered on the site (full info for doctor directory)
// @route   GET /api/patients/all
export const getAllPatientsOnSite = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = { role: 'patient' };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const patients = await User.find(filter)
      .select('name email phone profilePic gender dob address emergencyContact riskLevel diagnosis createdAt')
      .sort({ createdAt: -1 });

    // Enrich with session count and latest note for each patient
    const enriched = await Promise.all(patients.map(async (pt) => {
      const sessionCount = await Appointment.countDocuments({
        patient: pt._id,
        paymentStatus: 'paid',
        status: { $ne: 'cancelled' },
      });

      const latestNote = await SessionNote.findOne({ patient: pt._id })
        .sort({ createdAt: -1 })
        .select('riskLevel diagnosis sessionDescription createdAt')
        .lean();

      return {
        ...pt.toObject(),
        sessionCount,
        latestNote: latestNote || null,
      };
    }));

    res.json({ patients: enriched });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor analytics
// @route   GET /api/patients/analytics
export const getAnalytics = async (req, res, next) => {
  try {
    // For doctors: always show their own data
    // For admins: optionally allow selecting a doctor with query param
    let doctorId = req.user._id;
    
    if (req.user.role === 'admin' && req.query.doctorId) {
      doctorId = req.query.doctorId;
    }

    const totalPatientIds = await Appointment.distinct('patient', {
      doctor: doctorId,
      paymentStatus: 'paid',
      status: { $nin: ['cancelled', 'no-show'] }
    });
    const totalPatients = await User.countDocuments({
      _id: { $in: totalPatientIds },
      role: 'patient',
    });
    const totalSessions = await Appointment.countDocuments({
      doctor: doctorId,
      paymentStatus: 'paid',
      status: { $nin: ['cancelled', 'no-show'] }
    });

    const totalRev = await Appointment.aggregate([
      { $match: { doctor: doctorId, paymentStatus: 'paid', status: { $nin: ['cancelled', 'no-show'] } } },
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
          status: { $nin: ['cancelled', 'no-show'] },
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
          status: { $nin: ['completed', 'cancelled', 'no-show'] },
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
          status: { $nin: ['cancelled', 'no-show'] },
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
          status: { $nin: ['completed', 'cancelled', 'no-show'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    const revToday = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          paymentStatus: 'paid',
          status: { $nin: ['cancelled', 'no-show'] },
          date: { $gte: todayStart, $lt: todayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    const completedSessionsCount = await Appointment.countDocuments({
      doctor: doctorId,
      paymentStatus: 'paid',
      status: { $nin: ['cancelled', 'no-show'] },
      $or: [
        { status: 'completed' },
        { date: { $lt: todayEnd } }
      ]
    });

    const upcomingSessionsCount = await Appointment.countDocuments({
      doctor: doctorId,
      paymentStatus: 'paid',
      status: { $nin: ['completed', 'cancelled', 'no-show'] },
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
        { $match: { doctor: doctorId, paymentStatus: 'paid', status: { $nin: ['cancelled', 'no-show'] }, date: { $gte: d, $lt: nD } } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
      ]);
      const dayOrders = await Appointment.countDocuments({
        doctor: doctorId, paymentStatus: 'paid', status: { $nin: ['cancelled', 'no-show'] }, date: { $gte: d, $lt: nD }
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
        paymentStatus: 'paid',
        status: { $nin: ['cancelled', 'no-show'] },
        date: { $gte: startM, $lt: endM },
      });

      const revenueMonth = await Appointment.aggregate([
        { $match: { doctor: doctorId, paymentStatus: 'paid', status: { $nin: ['cancelled', 'no-show'] }, date: { $gte: startM, $lt: endM } } },
        { $group: { _id: null, total: { $sum: '$fee' } } }
      ]);

      const patientsMonthIds = await Appointment.distinct('patient', {
        doctor: doctorId,
        paymentStatus: 'paid',
        status: { $nin: ['cancelled', 'no-show'] },
        date: { $gte: startM, $lt: endM },
      });
      const patientsMonth = await User.countDocuments({
        _id: { $in: patientsMonthIds },
        role: 'patient',
      });

      monthlyData.push({
        month: startM.toLocaleDateString('en', { month: 'short' }),
        sessions,
        revenue: revenueMonth[0]?.total || 0,
        patients: patientsMonth,
      });
    }

    res.json({
      totalPatients,
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

    // Save to User model
    if (riskLevel !== undefined) patient.riskLevel = riskLevel;
    if (diagnosis !== undefined) patient.diagnosis = diagnosis;
    await patient.save();

    // Also sync to the latest SessionNote so history is consistent
    const latestNote = await SessionNote.findOne({
      patient: id,
      doctor: req.user._id,
    }).sort({ createdAt: -1 });

    if (latestNote) {
      if (riskLevel !== undefined) latestNote.riskLevel = riskLevel;
      if (diagnosis !== undefined) latestNote.diagnosis = diagnosis;
      await latestNote.save();
    }

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};