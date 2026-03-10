import User from '../models/User.js';

// @desc    Get all doctors
// @route   GET /api/doctors
export const getDoctors = async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor', isVerified: true, isActive: true })
      .select('name specialization bio profilePic rating totalReviews consultationFee chatFee experience availableSlots');

    res.json({ doctors });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single doctor
// @route   GET /api/doctors/:id
export const getDoctor = async (req, res, next) => {
  try {
    const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' })
      .select('name specialization bio profilePic rating totalReviews consultationFee chatFee experience availableSlots');

    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    res.json({ doctor });
  } catch (error) {
    next(error);
  }
};
