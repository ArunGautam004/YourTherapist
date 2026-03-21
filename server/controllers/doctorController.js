import User from '../models/User.js';
import DoctorProfile from '../models/profiles/DoctorProfile.js';

const mergeDoctorWithProfile = (userDoc, profileDoc) => {
  if (!userDoc) return null;
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  const profile = profileDoc?.toObject ? profileDoc.toObject() : (profileDoc || {});

  return {
    _id: user._id,
    name: user.name,
    specialization: profile.specialization ?? user.specialization ?? '',
    bio: profile.bio ?? user.bio ?? '',
    profilePic: profile.profilePic ?? user.profilePic ?? '',
    rating: profile.rating ?? user.rating ?? 0,
    totalReviews: profile.totalReviews ?? user.totalReviews ?? 0,
    consultationFee: profile.consultationFee ?? user.consultationFee ?? 1500,
    chatFee: profile.chatFee ?? user.chatFee ?? 800,
    experience: profile.experience ?? user.experience ?? 0,
    availableSlots: profile.availableSlots ?? user.availableSlots ?? [],
  };
};

// @desc    Get all doctors
// @route   GET /api/doctors
export const getDoctors = async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor', isVerified: true, isActive: true })
      .select('name specialization bio profilePic rating totalReviews consultationFee chatFee experience availableSlots');

    const doctorIds = doctors.map(d => d._id);
    const profiles = await DoctorProfile.find({ user: { $in: doctorIds } }).lean();
    const profileMap = new Map(profiles.map(p => [String(p.user), p]));

    const mergedDoctors = doctors.map((doctor) => mergeDoctorWithProfile(doctor, profileMap.get(String(doctor._id))));

    res.json({ doctors: mergedDoctors });
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

    const profile = await DoctorProfile.findOne({ user: doctor._id });
    const mergedDoctor = mergeDoctorWithProfile(doctor, profile);

    res.json({ doctor: mergedDoctor });
  } catch (error) {
    next(error);
  }
};
