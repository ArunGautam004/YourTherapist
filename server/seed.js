import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Appointment from './models/Appointment.js';
import SessionNote from './models/SessionNote.js';
import MoodEntry from './models/MoodEntry.js';
import Message from './models/Message.js';
import QuestionnaireTemplate from './models/QuestionnaireTemplate.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear ALL existing data
    await User.deleteMany({});
    await Appointment.deleteMany({});
    await SessionNote.deleteMany({});
    await MoodEntry.deleteMany({});
    await Message.deleteMany({});
    await QuestionnaireTemplate.deleteMany({});

    console.log('🗑️  Cleared all data');

    // Create only the Doctor
    const doctor = await User.create({
      name: 'Shubham Gautam',
      email: 'doctor@yourtherapist.com',
      password: 'doctor123',
      phone: '+91 7206086301',
      role: 'doctor',
      gender: 'Male',
      specialization: 'Psychology Consultant',
      license: 'DU-PSY-2024',
      experience: 1,
      bio: 'B.A. Psychology student at University of Delhi. Has treated 50+ patients specializing in anxiety, stress management, and emotional well-being counseling.',
      isVerified: true,
      consultationFee: 1500,
      chatFee: 800,
      rating: 4.9,
      totalReviews: 0,
      availableSlots: [
        { day: 'Monday', startTime: '9:00 AM', endTime: '5:00 PM' },
        { day: 'Tuesday', startTime: '9:00 AM', endTime: '5:00 PM' },
        { day: 'Wednesday', startTime: '9:00 AM', endTime: '5:00 PM' },
        { day: 'Thursday', startTime: '9:00 AM', endTime: '5:00 PM' },
        { day: 'Friday', startTime: '9:00 AM', endTime: '3:00 PM' },
        { day: 'Saturday', startTime: '10:00 AM', endTime: '2:00 PM' },
      ],
    });

    console.log(`👨‍⚕️ Doctor created: ${doctor.name} (${doctor.email})`);

    // Create questionnaire template
    await QuestionnaireTemplate.create({
      title: 'Session Check-in',
      description: 'Quick mood and progress assessment for therapy sessions',
      doctor: doctor._id,
      category: 'check-in',
      questions: [
        { text: 'How would you rate your overall mood this past week?', type: 'scale', options: ['1','2','3','4','5','6','7','8','9','10'] },
        { text: 'How often have you felt nervous or anxious?', type: 'choice', options: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
        { text: 'How would you describe your sleep quality?', type: 'choice', options: ['Very poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
        { text: 'Have you been able to practice the coping techniques we discussed?', type: 'choice', options: ['Yes, regularly', 'Sometimes', 'Rarely', 'Not at all'] },
        { text: 'Is there anything specific you would like to discuss today?', type: 'text' },
      ],
    });
    console.log('📋 Questionnaire template created');

    console.log('\n✅ Seed complete!');
    console.log('\n🔑 Doctor login credentials:');
    console.log('   Email: doctor@yourtherapist.com');
    console.log('   Password: doctor123');
    console.log('\n👥 No fake patients created — register real users from the website!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
