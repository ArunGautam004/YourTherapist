import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
  CalendarPlus, HeartPulse, MessageSquare, Video, Clock, ArrowRight,
  Bell, AlertTriangle, PhoneCall
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, moodAPI, sessionAPI } from '../../services/api';

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
  { name: 'Book Appointment', path: '/patient/book', icon: Calendar },
  { name: 'Mood Journal', path: '/patient/journal', icon: BookOpen },
  { name: 'Messages', path: '/patient/messages', icon: MessageCircle, badge: '3' },
  { name: 'Settings', path: '/patient/settings', icon: Settings },
];

const PatientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [moodData, setMoodData] = useState({ entries: [], stats: {} });
  const [sessionNotes, setSessionNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aptsRes, moodRes] = await Promise.all([
          appointmentAPI.getAll({ status: 'scheduled' }).catch(() => ({ data: { appointments: [] } })),
          moodAPI.getEntries(7).catch(() => ({ data: { entries: [], stats: {} } })),
        ]);
        setAppointments(aptsRes.data.appointments?.slice(0, 3) || []);
        setMoodData(moodRes.data || { entries: [], stats: {} });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const quickActions = [
    { name: 'Book Session', icon: CalendarPlus, path: '/patient/book', color: 'bg-primary text-white' },
    { name: 'Mood Check-in', icon: HeartPulse, path: '/patient/journal', color: 'bg-accent text-white' },
    { name: 'Messages', icon: MessageSquare, path: '/patient/messages', color: 'bg-secondary text-white' },
  ];

  const moodEmojis = ['😢', '😟', '😐', '😐', '🙂', '😊', '😊', '😄', '🤩', '🤩'];

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Welcome!', desc: 'Welcome to YourTherapist', time: 'Just now', read: false }
  ]);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={patientLinks} userRole="patient" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div variants={fadeInUp} className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
                {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}</span> 👋
              </h1>
              <p className="text-text-secondary mt-1">Here's an overview of your mental wellness journey.</p>
            </div>
            
            {/* Notification Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                className="hidden md:flex p-2.5 rounded-2xl bg-white shadow-soft hover:shadow-soft-lg transition-all relative"
              >
                <Bell className="w-5 h-5 text-text-secondary" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-semibold text-text-primary">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div key={notif.id} className="p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                            <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                            <p className="text-xs text-text-secondary mt-0.5">{notif.desc}</p>
                            <p className="text-[10px] text-text-secondary/60 mt-2">{notif.time}</p>
                          </div>
                        ))
                      ) : (
                        <p className="p-4 text-center text-sm text-text-secondary">No new notifications</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
            {quickActions.map((action) => (
              <Link key={action.name} to={action.path} className="card group hover:-translate-y-1 flex items-center gap-3 p-3 sm:p-4">
                <div className={`w-12 h-12 rounded-2xl ${action.color} flex items-center justify-center shadow-soft`}>
                  {action.name === 'Mood Check-in' ? (
                    <span className="text-2xl">😊</span>
                  ) : (
                    <action.icon className="w-6 h-6" />
                  )}
                </div>
                <span className="text-sm font-semibold text-text-primary">{action.name}</span>
              </Link>
            ))}
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Upcoming Sessions */}
            <motion.div variants={fadeInUp} className="lg:col-span-3 card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg text-text-primary">Upcoming Sessions</h2>
                <Link to="/patient/book" className="text-sm text-primary font-medium hover:text-primary-dark flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((apt) => {
                    // Determine if session is joinable (within 10 min before or during)
                    const aptDate = new Date(apt.date);
                    const [tPart, tPeriod] = (apt.time || '').split(' ');
                    let [tH, tM] = (tPart || '0:0').split(':').map(Number);
                    if (tPeriod === 'PM' && tH !== 12) tH += 12;
                    if (tPeriod === 'AM' && tH === 12) tH = 0;
                    aptDate.setHours(tH, tM || 0, 0, 0);
                    const now = new Date();
                    const diff = (aptDate - now) / 60000; // minutes until session
                    const canJoin = diff <= 10 && diff > -(apt.duration || 50);

                    return (
                      <div key={apt._id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-primary-light/20 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center">
                          <span className="text-xl">👨‍⚕️</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary">{apt.doctor?.name || 'Dr. Therapist'}</p>
                          <p className="text-xs text-text-secondary">{apt.doctor?.specialization || 'Clinical Psychologist'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text-primary">
                            {new Date(apt.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-text-secondary flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" /> {apt.time}
                          </p>
                        </div>
                        {apt.meetingLink && canJoin ? (
                          <Link to={apt.meetingLink} className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" /> Join
                          </Link>
                        ) : (
                          <span className="text-xs text-text-secondary bg-gray-100 px-3 py-1.5 rounded-xl">
                            {diff > 10 ? `In ${Math.ceil(diff / 60) > 24 ? Math.ceil(diff / 1440) + 'd' : Math.ceil(diff / 60) + 'h'}` : 'Ended'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-secondary text-sm">No upcoming sessions</p>
                  <Link to="/patient/book" className="text-primary text-sm font-medium mt-2 inline-block">Book your first session →</Link>
                </div>
              )}
            </motion.div>

            {/* This Week's Mood */}
            <motion.div variants={fadeInUp} className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg text-text-primary">This Week's Mood</h2>
                {moodData.stats?.changePercent ? (
                  <span className={`text-sm font-medium flex items-center gap-1 ${moodData.stats.changePercent >= 0 ? 'text-success' : 'text-danger'}`}>
                    <span className="text-xs">📈</span> {moodData.stats.changePercent > 0 ? '+' : ''}{moodData.stats.changePercent}%
                  </span>
                ) : null}
              </div>
              <div className="flex items-end justify-around h-24 mb-4">
                {(moodData.entries?.slice(0, 7) || []).reverse().map((entry, i) => (
                  <div key={entry._id || i} className="flex flex-col items-center gap-1">
                    <span className="text-lg">{entry.emoji || moodEmojis[Math.min(9, entry.score - 1)]}</span>
                    <span className="text-xs text-text-secondary">
                      {new Date(entry.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
                {(!moodData.entries || moodData.entries.length === 0) && (
                  <p className="text-sm text-text-secondary text-center w-full">No entries yet this week</p>
                )}
              </div>
              <Link to="/patient/journal" className="text-primary text-sm font-medium hover:underline block text-center">
                Log Today's Mood
              </Link>
            </motion.div>
          </div>

          {/* Crisis Support */}
          <motion.div variants={fadeInUp} className="mt-6 p-5 rounded-3xl bg-danger/5 border border-danger/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-danger text-sm">🆘 Crisis Support</h3>
                <p className="text-xs text-text-secondary mt-1">If you are in crisis, please reach out for immediate help.</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                  <a href="tel:7206086301" className="flex items-center gap-1 text-sm text-danger font-medium">
                    <PhoneCall className="w-3.5 h-3.5" /> Call: 7206086301
                  </a>
                  <a href="tel:18005990019" className="flex items-center gap-1 text-sm text-danger font-medium">
                    <PhoneCall className="w-3.5 h-3.5" /> Vandrevala: 1800-599-0019
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default PatientDashboard;
