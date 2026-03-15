import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
    Video, Clock, X, FileText, ClipboardList, Loader2
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { sessionAPI, appointmentAPI, messageAPI } from '../../services/api';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};

const PatientSessions = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionDetail, setSessionDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);

    // Consistent sidebar — live unread badge
    const patientLinks = [
        { name: 'Dashboard',        path: '/patient/dashboard', icon: LayoutDashboard },
        { name: 'My Sessions',      path: '/patient/sessions',  icon: Clock },
        { name: 'Book Appointment', path: '/patient/book',      icon: Calendar },
        { name: 'Mood Journal',     path: '/patient/journal',   icon: BookOpen },
        { name: 'Messages',         path: '/patient/messages',  icon: MessageCircle, badge: totalUnread > 0 ? String(totalUnread) : null },
        { name: 'Settings',         path: '/patient/settings',  icon: Settings },
    ];

    useEffect(() => {
        messageAPI.getConversations()
            .then(({ data }) => {
                const u = (data.conversations || []).reduce((s, c) => s + (c.unreadCount || 0), 0);
                setTotalUnread(u);
            }).catch(() => {});
    }, []);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);

                // Fetch all paid appointments (includes upcoming with populated doctor)
                const allRes = await appointmentAPI.getAll();
                const allApts = (allRes.data.appointments || []);

                // Also fetch session history to attach notes/questionnaire data
                let historyMap = {};
                try {
                    const histRes = await sessionAPI.getMyHistory();
                    (histRes.data.sessions || []).forEach(s => {
                        if (s.appointment?._id) {
                            historyMap[s.appointment._id] = {
                                sessionNote: s.sessionNote,
                                questionnaireResponses: s.questionnaireResponses,
                            };
                        }
                    });
                } catch (_) { /* history fetch optional */ }

                const merged = allApts
                    .filter(apt => apt.paymentStatus === 'paid')
                    .map(apt => ({
                        ...apt,
                        doctor: apt.doctor && typeof apt.doctor === 'object' ? apt.doctor : null,
                        ...(historyMap[apt._id] || {}),
                    }));

                setAppointments(merged);
            } catch (err) {
                console.error('Failed to load appointments:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, []);

    const handleViewDetail = async (apt) => {
        setSelectedSession(apt);
        setDetailLoading(true);
        try {
            const { data } = await sessionAPI.getSessionDetail(apt._id);
            setSessionDetail(data);
        } catch (err) {
            console.error('Failed to load session detail:', err);
            setSessionDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const sortedAppointments = [...appointments].map(apt => {
        const safeDate = new Date(apt.date || Date.now());

        const timeStr = String(apt.time || '12:00 PM').toUpperCase();
        let tH = 12, tM = 0;
        const timeMatch = timeStr.match(/(\d+):?(\d+)?/);
        if (timeMatch) {
            tH = parseInt(timeMatch[1], 10);
            tM = parseInt(timeMatch[2] || '0', 10);
        }
        if (timeStr.includes('PM') && tH < 12) tH += 12;
        if (timeStr.includes('AM') && tH === 12) tH = 0;

        const aptDate = new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate(), tH, tM, 0, 0);
        const endTime = new Date(aptDate.getTime() + (apt.duration || 50) * 60000);

        const now = new Date();
        const isValidDate = !isNaN(aptDate.getTime());
        const diff = isValidDate ? (aptDate.getTime() - now.getTime()) / 60000 : Infinity;

        const isOngoing = isValidDate && diff <= 10 && now < endTime && apt.status !== 'cancelled';
        const isPast = ['completed', 'cancelled', 'no-show'].includes(apt.status) || (isValidDate && now >= endTime);

        // ✅ Session link is only active 10 min before to session end
        const isLinkActive = isValidDate && diff <= 10 && now < endTime;

        let displayStatus = 'Upcoming';
        if (!isValidDate) {
            displayStatus = 'Unknown Date';
        } else if (apt.status === 'cancelled') {
            displayStatus = 'Cancelled';
        } else if (isPast) {
            displayStatus = 'Ended';
        } else if (isOngoing) {
            displayStatus = 'Ongoing';
        } else if (diff > 0 && diff <= 60) {
            displayStatus = `In ${Math.ceil(diff)}m`;
        } else if (diff > 60) {
            const days = Math.floor(diff / 1440);
            const hours = Math.floor((diff % 1440) / 60);
            if (days > 0) displayStatus = `In ${days}d`;
            else displayStatus = `In ${hours}h`;
        }

        return { ...apt, aptDate, isValidDate, safeDate, diff, isOngoing, isPast, displayStatus, isLinkActive };
    }).sort((a, b) => {
        // Ongoing first, then upcoming, then past
        if (a.isOngoing && !b.isOngoing) return -1;
        if (!a.isOngoing && b.isOngoing) return 1;
        if (!a.isPast && b.isPast) return -1;
        if (a.isPast && !b.isPast) return 1;
        return (a.aptDate?.getTime() || 0) - (b.aptDate?.getTime() || 0);
    });

    // ✅ Simplified render: ended/ongoing only show View Details + Join link
    const renderAppointment = (apt) => (
        <div key={apt._id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {apt.doctor?.profilePic
                        ? <img src={apt.doctor.profilePic} alt={apt.doctor.name} className="w-full h-full object-cover" />
                        : <span className="text-2xl">👨‍⚕️</span>}
                </div>
                <div>
                    <p className="font-semibold text-text-primary">
                        {apt.doctor?.name
                            ? (apt.doctor.name.toLowerCase().startsWith('dr') ? apt.doctor.name : `Dr. ${apt.doctor.name}`)
                            : 'Dr. Therapist'}
                    </p>
                    <p className="text-sm text-text-secondary">{apt.doctor?.specialization || 'Clinical Psychologist'}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="bg-white px-3 py-2 rounded-xl border border-gray-100 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    {apt.isValidDate ? apt.safeDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                </div>
                <div className="bg-white px-3 py-2 rounded-xl border border-gray-100 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    {apt.time || 'TBD'}
                </div>

                {/* Ongoing: Join + View Details */}
                {apt.isOngoing ? (
                    <div className="flex items-center gap-2">
                        {apt.isLinkActive && apt.meetingLink && (
                            <Link to={apt.meetingLink} className="btn-primary whitespace-nowrap !px-4 !py-2 flex items-center gap-1.5 text-sm">
                                <Video className="w-4 h-4" /> Join Session
                            </Link>
                        )}
                        <button
                            onClick={() => handleViewDetail(apt)}
                            className="px-4 py-2 rounded-xl bg-primary-light text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center gap-1"
                        >
                            <FileText className="w-4 h-4" /> Details
                        </button>
                    </div>
                ) : apt.isPast && apt.displayStatus !== 'Cancelled' ? (
                    /* Past: View Details */
                    <button
                        onClick={() => handleViewDetail(apt)}
                        className="px-4 py-2 rounded-xl bg-primary-light text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center gap-1"
                    >
                        <FileText className="w-4 h-4" /> View Details
                    </button>
                ) : apt.displayStatus === 'Cancelled' ? (
                    /* Cancelled badge */
                    <span className="text-sm font-medium px-4 py-2 rounded-xl bg-danger/10 text-danger">
                        Cancelled
                    </span>
                ) : (
                    /* Upcoming: status badge only — View Details not available yet */
                    <span className="text-sm font-medium px-3 py-1.5 rounded-xl bg-primary-light text-primary">
                        {apt.displayStatus}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={patientLinks} userRole="patient" />

            <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
                <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-5xl mx-auto">
                    <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
                                My <span className="gradient-text">Sessions</span>
                            </h1>
                            <p className="text-text-secondary mt-1">Your therapy session history and upcoming appointments.</p>
                        </div>
                        <Link to="/patient/book" className="btn-primary flex items-center gap-2 self-start md:self-auto">
                            <Calendar className="w-4 h-4" /> Book New Session
                        </Link>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="space-y-8">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : sortedAppointments.length > 0 ? (
                            <>
                                {/* ONGOING */}
                                {sortedAppointments.filter(a => a.isOngoing).length > 0 && (
                                    <div className="card border-l-4 border-l-amber-400">
                                        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                            Ongoing Session
                                        </h2>
                                        <div className="space-y-4">
                                            {sortedAppointments.filter(a => a.isOngoing).map(renderAppointment)}
                                        </div>
                                    </div>
                                )}

                                {/* UPCOMING */}
                                {sortedAppointments.filter(a => !a.isPast && !a.isOngoing).length > 0 && (
                                    <div className="card">
                                        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-primary" />
                                            Upcoming Sessions
                                        </h2>
                                        <div className="space-y-4">
                                            {sortedAppointments.filter(a => !a.isPast && !a.isOngoing).map(renderAppointment)}
                                        </div>
                                    </div>
                                )}

                                {/* PAST */}
                                {sortedAppointments.filter(a => a.isPast).length > 0 && (
                                    <div className="card">
                                        <h2 className="text-xl font-bold text-text-primary mb-4">Past Sessions</h2>
                                        <div className="space-y-4">
                                            {sortedAppointments.filter(a => a.isPast).reverse().map(renderAppointment)}
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
                                <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6">You don't have any confirmed therapy sessions yet.</p>
                                <Link to="/patient/book" className="btn-primary inline-flex">Book a Session</Link>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </main>

            {/* Session Detail Modal */}
            <AnimatePresence>
                {selectedSession && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setSelectedSession(null); setSessionDetail(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                                <div>
                                    <h3 className="font-display font-bold text-lg text-text-primary">Session Details</h3>
                                    <p className="text-sm text-text-secondary">
                                        {selectedSession.isValidDate
                                            ? selectedSession.safeDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                                            : 'Unknown Date'
                                        } • {selectedSession.time}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setSelectedSession(null); setSessionDetail(null); }}
                                    className="p-2 rounded-xl hover:bg-gray-100 text-text-secondary transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 space-y-5">
                                {detailLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
                                            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                                                {selectedSession.doctor?.profilePic
                                                    ? <img src={selectedSession.doctor.profilePic} alt={selectedSession.doctor.name} className="w-full h-full object-cover" />
                                                    : <span>👨‍⚕️</span>}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-text-primary">{selectedSession.doctor?.name || 'Doctor'}</p>
                                                <p className="text-sm text-text-secondary">{selectedSession.doctor?.specialization || 'Therapist'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                Session Notes
                                            </h4>
                                            {sessionDetail?.sessionNote?.sessionDescription ? (
                                                <div className="p-4 rounded-xl bg-primary-light/50 border border-primary/10">
                                                    <p className="text-sm text-text-primary leading-relaxed">{sessionDetail.sessionNote.sessionDescription}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-text-secondary italic">No session notes available</p>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                Doctor's Report
                                            </h4>
                                            {sessionDetail?.sessionNote?.report ? (
                                                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                                                    <p className="text-sm text-text-primary leading-relaxed">{sessionDetail.sessionNote.report}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-text-secondary italic">No report generated yet</p>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                                                <ClipboardList className="w-4 h-4 text-primary" />
                                                Questionnaire Responses
                                            </h4>
                                            {sessionDetail?.questionnaireResponses?.length > 0 ? (
                                                <div className="space-y-3">
                                                    {sessionDetail.questionnaireResponses.map((qr, i) => (
                                                        <div key={i} className="p-4 rounded-xl border border-gray-100">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div>
                                                                    <p className="font-medium text-text-primary text-sm">{qr.template?.title || 'Questionnaire'}</p>
                                                                    {qr.template?.diseaseName && (
                                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{qr.template.diseaseName}</span>
                                                                    )}
                                                                </div>
                                                                {qr.totalScore > 0 && (
                                                                    <span className="text-sm font-bold text-primary">Score: {qr.totalScore}</span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                {(qr.responses || []).map((r, ri) => (
                                                                    <div key={ri} className="text-sm bg-gray-50 p-2 rounded-lg">
                                                                        <p className="text-text-secondary text-xs mb-0.5">{r.questionText}</p>
                                                                        <p className="font-medium text-text-primary">{r.answer}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-text-secondary italic">No questionnaires submitted for this session</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PatientSessions;