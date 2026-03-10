import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
    Video, Clock, Filter
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI } from '../../services/api';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};

const patientLinks = [
    { name: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
    { name: 'My Sessions', path: '/patient/sessions', icon: Clock },
    { name: 'Book Appointment', path: '/patient/book', icon: Calendar },
    { name: 'Mood Journal', path: '/patient/journal', icon: BookOpen },
    { name: 'Messages', path: '/patient/messages', icon: MessageCircle, badge: '3' },
    { name: 'Settings', path: '/patient/settings', icon: Settings },
];

const PatientSessions = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                const res = await appointmentAPI.getAll();
                setAppointments(res.data.appointments || []);
            } catch (err) {
                console.error('Failed to load appointments:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, []);

    const sortedAppointments = [...appointments].map(apt => {
        const safeDate = new Date(apt.date);
        const isValidDate = !isNaN(safeDate);

        let aptDate = new Date();
        let endTime = new Date();
        if (isValidDate) {
            const localY = safeDate.getFullYear();
            const localM = safeDate.getMonth();
            const localD = safeDate.getDate();

            const [tPart, tPeriod] = (apt.time || '').split(' ');
            let [tH, tM] = (tPart || '0:0').split(':').map(Number);
            if (tPeriod === 'PM' && tH !== 12) tH += 12;
            if (tPeriod === 'AM' && tH === 12) tH = 0;

            aptDate = new Date(localY, localM, localD, tH, tM || 0, 0, 0);
            endTime = new Date(aptDate.getTime() + (apt.duration || 50) * 60000);
        }

        const now = new Date();
        const diff = isValidDate ? (aptDate - now) / 60000 : Infinity;

        // A session is ongoing if it's within 10 mins of starting OR it has started but hasn't ended yet
        const isOngoing = isValidDate && diff <= 10 && now < endTime && apt.status !== 'cancelled';
        const isPast = ['completed', 'cancelled', 'no-show'].includes(apt.status) || (isValidDate && now >= endTime);

        let displayStatus = 'Upcoming';
        if (apt.status === 'cancelled') {
            displayStatus = 'Cancelled';
        } else if (isPast) {
            displayStatus = apt.patientJoined ? 'Ended' : 'Expired';
        } else if (isOngoing) {
            displayStatus = 'Ongoing';
        } else if (diff > 0 && diff <= 60) {
            displayStatus = `In ${Math.ceil(diff)}m`;
        } else if (diff > 60) {
            displayStatus = `In ${Math.ceil(diff / 60) > 24 ? Math.ceil(diff / 1440) + 'd' : Math.ceil(diff / 60) + 'h'}`;
        }

        return { ...apt, aptDate, isValidDate, safeDate, diff, isOngoing, isPast, displayStatus };
    }).sort((a, b) => {
        return (a.aptDate.getTime() || 0) - (b.aptDate.getTime() || 0); // global ascending sort
    });

    const renderAppointment = (apt) => (
        <div key={apt._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">👨‍⚕️</span>
                </div>
                <div>
                    <p className="font-semibold text-text-primary text-lg">{apt.doctor?.name || 'Dr. Therapist'}</p>
                    <p className="text-sm text-text-secondary">{apt.doctor?.specialization || 'Clinical Psychologist'}</p>
                </div>
            </div>

            <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap mt-2 sm:mt-0">
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div className="text-sm font-medium">
                        {apt.isValidDate ? apt.safeDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date'}
                    </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <div className="text-sm font-medium">{apt.time || 'TBD'}</div>
                </div>

                {apt.meetingLink && apt.isOngoing ? (
                    <Link to={apt.meetingLink} className="btn-primary whitespace-nowrap !px-6 flex items-center gap-2">
                        <Video className="w-4 h-4" /> Join Session
                    </Link>
                ) : (
                    <div className="w-[140px] flex justify-end">
                        <span className={`text-sm font-medium px-4 py-2 rounded-xl text-center w-full ${apt.displayStatus === 'Cancelled' ? 'bg-danger/10 text-danger' :
                            (apt.displayStatus === 'Ended' || apt.displayStatus === 'Expired') ? 'bg-gray-200 text-text-secondary' :
                                apt.displayStatus === 'Ongoing' ? 'bg-success/10 text-success shadow-sm' :
                                    'bg-primary-light text-primary'
                            }`}>
                            {apt.displayStatus}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={patientLinks} userRole="patient" />

            <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
                <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-5xl mx-auto">
                    {/* Header */}
                    <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
                                My <span className="gradient-text">Sessions</span>
                            </h1>
                            <p className="text-text-secondary mt-1">Manage your upcoming and past therapy sessions.</p>
                        </div>

                        <Link to="/patient/book" className="btn-primary flex items-center gap-2 self-start md:self-auto">
                            <Calendar className="w-4 h-4" /> Book New Session
                        </Link>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="space-y-8">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : sortedAppointments.length > 0 ? (
                            <>
                                {/* ONGOING */}
                                {sortedAppointments.filter((apt) => apt.isOngoing).length > 0 && (
                                    <div className="card">
                                        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                            Ongoing Session
                                        </h2>
                                        <div className="space-y-4">
                                            {sortedAppointments.filter((apt) => apt.isOngoing).map(renderAppointment)}
                                        </div>
                                    </div>
                                )}

                                {/* UPCOMING */}
                                {sortedAppointments.filter((apt) => !apt.isPast && !apt.isOngoing).length > 0 && (
                                    <div className="card">
                                        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-primary" />
                                            Upcoming Sessions
                                        </h2>
                                        <div className="space-y-4">
                                            {sortedAppointments.filter((apt) => !apt.isPast && !apt.isOngoing).map(renderAppointment)}
                                        </div>
                                    </div>
                                )}

                                {/* ENDED */}
                                {sortedAppointments.filter((apt) => apt.isPast).length > 0 && (
                                    <div className="card">
                                        <h2 className="text-xl font-bold text-text-primary mb-4">
                                            Past Sessions
                                        </h2>
                                        <div className="space-y-4">
                                            {sortedAppointments.filter((apt) => apt.isPast).reverse().map(renderAppointment)}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="card text-center py-12">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-text-primary mb-1">No sessions found</h3>
                                <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6">You don't have any therapy sessions scheduled.</p>
                                <Link to="/patient/book" className="btn-primary inline-flex">Book a Session</Link>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </main>
        </div>
    );
};

export default PatientSessions;
