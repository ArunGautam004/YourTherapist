import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    console.log('UTC Now:', now.toISOString());
    console.log('todayStart:', todayStart.toISOString());
    console.log('todayEnd:', todayEnd.toISOString());

    const appointmentsCol = mongoose.connection.db.collection('appointments');
    const appointments = await appointmentsCol.find({ status: { $ne: 'cancelled' } }).project({ date: 1, status: 1 }).toArray();

    console.log('\nAppointments (from raw collection):');
    appointments.forEach(a => {
        const isPastToday = a.date < todayEnd;
        const isUpcoming = a.date >= todayEnd;
        console.log(`- ID: ${a._id}, Date: ${a.date.toISOString()}, Status: ${a.status}, isPastToday: ${isPastToday}, isUpcoming: ${isUpcoming}`);
    });

    const messagesCol = mongoose.connection.db.collection('messages');
    const unreadMessages = await messagesCol.countDocuments({ read: false });
    console.log('\nTotal unread messages in DB:', unreadMessages);

    await mongoose.disconnect();
}

debug();
