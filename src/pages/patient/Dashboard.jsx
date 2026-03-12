import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
  CalendarPlus, HeartPulse, MessageSquare, Video, Clock, ArrowRight,
  Bell, AlertTriangle, PhoneCall
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, moodAPI, sessionAPI, notificationAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

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

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [moodData, setMoodData] = useState({ entries: [], stats: {} });
  const [loading, setLoading] = useState(true);

  // ── Notifications (real data, same bell UI as before) ──────────────────
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    notificationAPI.getAll()
      .then(({ data }) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, []);

  // Real-time: new notification arrives via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadCount > 0) {
      try {
        await notificationAPI.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      } catch (e) { /* silent */ }
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.read) {
      try {
        await notificationAPI.markOneRead(notif._id);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) { /* silent */ }
    }
    setShowNotifications(false);
    if (notif.link) navigate(notif.link);
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };
  // ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, moodRes] = await Promise.all([
          sessionAPI.getMyHistory().catch(() => ({ data: { sessions: [] } })),
          moodAPI.getEntries(7).catch(() => ({ data: { entries: [], stats: {} } })),
        ]);

        const allApts = (historyRes.data.sessions || []).map(s => s.appointment);

        const activeApts = allApts.filter(apt => {
          if (apt.status === 'cancelled' || apt.status === 'completed' || apt.status === 'no-show') return false;
          const aptDate = new Date(apt.date || Date.now());
          const timeStr = String(apt.time || '12:00 PM').toUpperCase();
          let tH = 12, tM = 0;
          const timeMatch = timeStr.match(/(\d+):?(\d+)?/);
          if (timeMatch) {
            tH = parseInt(timeMatch[1], 10);
            tM = parseInt(timeMatch[2] || '0', 10);
          }
          if (timeStr.includes('PM') && tH < 12) tH += 12;
          if (timeStr.includes('AM') && tH === 12) tH = 0;
          aptDate.setHours(tH, tM, 0, 0);
          const endTime = new Date(aptDate.getTime() + (apt.duration || 50) * 60000);
          return new Date() < endTime;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        setAppointments(activeApts.slice(0, 3));
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

            {/* Bell — same look, now real data */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleBellClick}
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
                      {notifications.length > 0 && (
                        <span className="text-xs text-text-secondary">{notifications.length} total</span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div
                            key={notif._id}
                            onClick={() => handleNotifClick(notif)}
                            className={`p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer ${!notif.read ? 'bg-primary-light/30' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${!notif.read ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>
                                {notif.title}
                              </p>
                              {!notif.read && <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />}
                            </div>
                            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] text-text-secondary/60 mt-2">{timeAgo(notif.createdAt)}</p>
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
                <Link to="/patient/sessions" className="text-sm text-primary font-medium hover:text-primary-dark flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-3">
                  {[...appointments].map(apt => {
                    const safeDate = new Date(apt.date);
                    const isValidDate = !isNaN(safeDate);
                    let aptDate = new Date();
                    let endTime = new Date();
                    if (isValidDate) {
                      const localY = safeDate.getFullYear();
                      const localM = safeDate.getMonth();
                      const localD = safeDate.getDate();
                      const [timeStr, period] = (apt.time || '12:00 PM').split(' ');
                      let [h, m] = timeStr.split(':').map(Number);
                      if (period === 'PM' && h !== 12) h += 12;
                      if (period === 'AM' && h === 12) h = 0;
                      aptDate = new Date(localY, localM, localD, h, m || 0, 0, 0);
                      endTime = new Date(aptDate.getTime() + (apt.duration || 50) * 60000);
                    }
                    const now = new Date();
                    const diff = isValidDate ? (aptDate - now) / 60000 : Infinity;
                    const isOngoing = isValidDate && diff <= 10 && now < endTime && apt.status !== 'cancelled';
                    const isPast = ['completed', 'cancelled', 'no-show'].includes(apt.status) || (isValidDate && now >= endTime);
                    return { ...apt, aptDate, safeDate, isValidDate, diff, isOngoing, isPast };
                  })
                    .filter(apt => !apt.isPast)
                    .sort((a, b) => {
                      if (a.isOngoing && !b.isOngoing) return -1;
                      if (!a.isOngoing && b.isOngoing) return 1;
                      return (a.aptDate.getTime() || 0) - (b.aptDate.getTime() || 0);
                    })
                    .map((apt) => (
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
                            {apt.isValidDate ? apt.safeDate.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : 'Unknown Date'}
                          </p>
                          <p className="text-xs text-text-secondary flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" /> {apt.time}
                          </p>
                        </div>
                        {apt.meetingLink && apt.isOngoing ? (
                          <Link to={apt.meetingLink} className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" /> Join
                          </Link>
                        ) : (
                          <span className={`text-xs px-3 py-1.5 rounded-xl font-medium ${apt.isOngoing ? 'bg-success/10 text-success shadow-sm' : 'bg-primary-light/50 text-primary'}`}>
                            {apt.isOngoing ? 'Ongoing' : (apt.diff > 60 ? `In ${Math.ceil(apt.diff / 60) > 24 ? Math.ceil(apt.diff / 1440) + 'd' : Math.ceil(apt.diff / 60) + 'h'}` : `In ${Math.ceil(apt.diff)}m`)}
                          </span>
                        )}
                      </div>
                    ))}
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