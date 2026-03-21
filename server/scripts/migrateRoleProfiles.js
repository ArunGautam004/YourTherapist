import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { syncRoleProfile } from '../utils/roleProfileSync.js';

dotenv.config();

const hasCompletedMandatoryProfile = (user) => {
  const hasPhone = typeof user.phone === 'string' && user.phone.trim().length >= 10;
  const hasProfilePic = typeof user.profilePic === 'string' && user.profilePic.trim().length > 5;
  const hasGender = ['Male', 'Female', 'Other'].includes(user.gender);
  return hasPhone && hasProfilePic && hasGender;
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);

    const users = await User.find({});
    let synced = 0;
    let profileCompletedUpdated = 0;

    for (const user of users) {
      await syncRoleProfile(user);
      synced += 1;

      const shouldComplete = hasCompletedMandatoryProfile(user);
      if (user.profileCompleted !== shouldComplete) {
        user.profileCompleted = shouldComplete;
        await user.save();
        profileCompletedUpdated += 1;
      }
    }

    console.log(`Role profiles synced: ${synced}`);
    console.log(`profileCompleted normalized: ${profileCompletedUpdated}`);

    const [userCount, patientProfileCount, doctorProfileCount, adminProfileCount] = await Promise.all([
      mongoose.connection.db.collection('users').countDocuments(),
      mongoose.connection.db.collection('patientprofiles').countDocuments(),
      mongoose.connection.db.collection('doctorprofiles').countDocuments(),
      mongoose.connection.db.collection('adminprofiles').countDocuments(),
    ]);

    console.log('Collection counts after migration:');
    console.log(`users: ${userCount}`);
    console.log(`patientprofiles: ${patientProfileCount}`);
    console.log(`doctorprofiles: ${doctorProfileCount}`);
    console.log(`adminprofiles: ${adminProfileCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

run();
