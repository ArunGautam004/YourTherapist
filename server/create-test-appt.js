import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from './models/Appointment.js';
import User from './models/User.js';

dotenv.config();

const createTestAppointment = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find the patient
        const patient = await User.findOne({ email: 'arungautam0041@gmail.com' });
        if (!patient) {
            console.log('Patient arungautam0041@gmail.com not found!');
            process.exit(1);
        }

        // Find a doctor
        const doctor = await User.findOne({ email: 'doctor@yourtherapist.com' });
        if (!doctor) {
            console.log('Doctor not found!');
            process.exit(1);
        }

        // Create a 2-hour appointment starting now
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const newAppointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            date: now,
            time: timeStr,
            duration: 120, // 2 hours
            status: 'upcoming',
            paymentStatus: 'paid',
            meetingLink: `/session/${new mongoose.Types.ObjectId()}` // Generate a fake ID for testing
        });

        console.log('Created test appointment:', newAppointment._id);
        console.log(`Meeting Link: ${newAppointment.meetingLink}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createTestAppointment();
