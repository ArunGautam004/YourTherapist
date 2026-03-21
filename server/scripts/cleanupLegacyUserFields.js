import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const fieldsToUnset = {
  riskLevel: '',
  diagnosis: '',
  license: '',
};

const run = async () => {
  const apply = process.argv.includes('--apply');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);

    const usersWithLegacyFields = await User.find({
      $or: [
        { riskLevel: { $exists: true, $ne: '' } },
        { diagnosis: { $exists: true, $ne: '' } },
        { license: { $exists: true, $ne: '' } },
      ],
    }).select('_id role riskLevel diagnosis license');

    console.log(`Users with removable legacy fields: ${usersWithLegacyFields.length}`);

    if (!apply) {
      console.log('Dry run only. No changes made.');
      console.log('Run with --apply to perform cleanup.');
      process.exit(0);
    }

    const result = await User.updateMany({}, { $unset: fieldsToUnset });
    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    process.exit(1);
  }
};

run();
