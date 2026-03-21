import PatientProfile from '../models/profiles/PatientProfile.js';
import DoctorProfile from '../models/profiles/DoctorProfile.js';
import AdminProfile from '../models/profiles/AdminProfile.js';

const extractBaseProfile = (user, updates = {}) => ({
  phone: updates.phone ?? user.phone ?? '',
  gender: updates.gender ?? user.gender ?? '',
  dob: updates.dob ?? user.dob,
  profilePic: updates.profilePic ?? user.profilePic ?? '',
  address: updates.address ?? user.address ?? '',
  emergencyContact: updates.emergencyContact ?? user.emergencyContact ?? '',
});

const extractPatientProfile = (user, updates = {}) => ({
  ...extractBaseProfile(user, updates),
  riskLevel: updates.riskLevel ?? user.riskLevel ?? '',
  diagnosis: updates.diagnosis ?? user.diagnosis ?? '',
});

const extractDoctorProfile = (user, updates = {}) => ({
  ...extractBaseProfile(user, updates),
  specialization: updates.specialization ?? user.specialization ?? '',
  license: updates.license ?? user.license ?? '',
  experience: updates.experience ?? user.experience ?? 0,
  bio: updates.bio ?? user.bio ?? '',
  consultationFee: updates.consultationFee ?? user.consultationFee ?? 1500,
  chatFee: updates.chatFee ?? user.chatFee ?? 800,
  availableSlots: updates.availableSlots ?? user.availableSlots ?? [],
  rating: user.rating ?? 0,
  totalReviews: user.totalReviews ?? 0,
});

const extractAdminProfile = (user, updates = {}) => ({
  ...extractBaseProfile(user, updates),
  bio: updates.bio ?? user.bio ?? '',
});

export const syncRoleProfile = async (user, updates = {}) => {
  if (!user?._id || !user.role) return null;

  if (user.role === 'patient') {
    return PatientProfile.findOneAndUpdate(
      { user: user._id },
      { $set: extractPatientProfile(user, updates) },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
  }

  if (user.role === 'doctor') {
    return DoctorProfile.findOneAndUpdate(
      { user: user._id },
      { $set: extractDoctorProfile(user, updates) },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
  }

  if (user.role === 'admin') {
    return AdminProfile.findOneAndUpdate(
      { user: user._id },
      { $set: extractAdminProfile(user, updates) },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
  }

  return null;
};
