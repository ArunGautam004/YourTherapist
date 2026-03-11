import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
    Video, Clock, X, FileText, ClipboardList, ChevronRight, Loader2
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, sessionAPI } from '../../services/api';

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
    { name: 'Messages', path: '/patient/messages', icon: MessageCircle },
    { name: 'Settings', path: '/patient/settings', icon: Settings },
];

const PatientSessions = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionDetail, setSessionDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                const res = await sessionAPI.getMyHistory();
                const sessionHistory = res.data.sessions || [];
                // map session history to extract just the appointments for the dashboard format
                const apts = sessionHistory.map(s => {
                    const apt = s.appointment;
                    apt.sessionNote = s.sessionNote;
                    apt.questionnaireResponses = s.questionnaireResponses;
                    return apt;
                });
                setAppointments(apts);
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

        let aptDate = new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate(), tH, tM, 0, 0);
        let endTime = new Date(aptDate.getTime() + (apt.duration || 50) * 60000);

        const now = new Date();
        const isValidDate = !isNaN(aptDate.getTime());
        const diff = isValidDate ? (aptDate.getTime() - now.getTime()) / 60000 : Infinity;

        const isOngoing = isValidDate && diff <= 10 && now < endTime && apt.status !== 'cancelled';
        const isPast = ['completed', 'cancelled', 'no-show'].includes(apt.status) || (isValidDate && now >= endTime);

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

        return { ...apt, aptDate, isValidDate, safeDate, diff, isOngoing, isPast, displayStatus };
    }).sort((a, b) => {
        return (a.aptDate?.getTime() || 0) - (b.aptDate?.getTime() || 0);
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

            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap mt-2 sm:mt-0">
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
                ) : apt.isPast && apt.displayStatus !== 'Cancelled' ? (
                    <button
                        onClick={() => handleViewDetail(apt)}
                        className="px-4 py-2 rounded-xl bg-primary-light text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center gap-1"
                    >
                        <FileText className="w-4 h-4" /> View Details
                    </button>
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
                            {/* Modal Header */}
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
                                        {/* Doctor Info */}
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
                                            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-2xl">👨‍⚕️</div>
                                            <div>
                                                <p className="font-semibold text-text-primary">{selectedSession.doctor?.name || 'Doctor'}</p>
                                                <p className="text-sm text-text-secondary">{selectedSession.doctor?.specialization || 'Therapist'}</p>
                                            </div>
                                        </div>

                                        {/* Session Description */}
                                        <div>
                                            <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                Session Description
                                            </h4>
                                            {sessionDetail?.sessionNote?.sessionDescription ? (
                                                <div className="p-4 rounded-xl bg-primary-light/50 border border-primary/10">
                                                    <p className="text-sm text-text-primary leading-relaxed">{sessionDetail.sessionNote.sessionDescription}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-text-secondary italic">No session description available</p>
                                            )}
                                        </div>

                                        {/* Doctor's Report */}
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

                                        {/* Questionnaire Responses */}
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
                                                <p className="text-sm text-text-secondary italic">No questionnaires were submitted for this session</p>
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
