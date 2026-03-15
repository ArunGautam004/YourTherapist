import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
  Video, Clock, AlertTriangle, ArrowRight, Bell, ClipboardList,
  TrendingUp, TrendingDown, CheckCircle2, XCircle, Sun, Moon,
  Activity, ChevronRight, UserCheck, Stethoscope
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, patientAPI, messageAPI, notificationAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger  = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Good Night',     icon: Moon };
  if (h < 12) return { text: 'Good Morning',   icon: Sun };
  if (h < 17) return { text: 'Good Afternoon', icon: Sun };
  return       { text: 'Good Evening',         icon: Moon };
};

const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const parseSessionTime = (session) => {
  const d = new Date(session.date);
  const [tp, per] = (session.time || '').split(' ');
  let [h, m] = (tp || '0:0').split(':').map(Number);
  if (per === 'PM' && h !== 12) h += 12;
  if (per === 'AM' && h === 12) h = 0;
  d.setHours(h, m || 0, 0, 0);
  return d;
};

const getSessionMeta = (session) => {
  const aptDate = parseSessionTime(session);
  const end = new Date(aptDate.getTime() + (session.duration || 50) * 60000);
  const now = new Date();
  const diff = (aptDate - now) / 60000;
  const isOngoing  = diff <= 10 && now < end && session.status !== 'cancelled';
  const isPast     = now >= end || ['completed', 'cancelled', 'no-show'].includes(session.status);
  const isUpcoming = !isOngoing && !isPast;
  const display    = session.status === 'cancelled' ? 'Cancelled'
    : isOngoing  ? 'Ongoing'
    : isPast     ? (session.patientJoined ? 'Ended' : 'Expired')
    : diff <= 60 ? `In ${Math.ceil(diff)}m`
    : `In ${Math.floor(diff / 60)}h`;
  return { aptDate, end, isOngoing, isPast, isUpcoming, display };
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [todaySessions, setTodaySessions] = useState([]);
  const [patients, setPatients]           = useState([]);
  const [analytics, setAnalytics]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  const [notifications, setNotifications]     = useState([]);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const greeting = getGreeting();

  // Dynamic sidebar badge
  const adminLinks = [
    { name: 'Dashboard',      path: '/admin/dashboard',      icon: LayoutDashboard },
    { name: 'Patients',       path: '/admin/patients',       icon: Users },
    { name: 'Calendar',       path: '/admin/calendar',       icon: Calendar },
    { name: 'Analytics',      path: '/admin/analytics',      icon: BarChart3 },
    { name: 'Questionnaires', path: '/admin/questionnaires', icon: ClipboardList },
    { name: 'Messages',       path: '/admin/messages',       icon: MessageCircle, badge: totalUnreadMessages > 0 ? String(totalUnreadMessages) : null },
    { name: 'Settings',       path: '/admin/settings',       icon: Settings },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        const [todayRes, patientsRes, analyticsRes, messagesRes, notifRes] = await Promise.all([
          appointmentAPI.getToday().catch(() => ({ data: { appointments: [] } })),
          patientAPI.getAll().catch(() => ({ data: { patients: [] } })),
          patientAPI.getAnalytics().catch(() => ({ data: {} })),
          messageAPI.getConversations().catch(() => ({ data: { conversations: [] } })),
          notificationAPI.getAll().catch(() => ({ data: { notifications: [], unreadCount: 0 } })),
        ]);
        const paid = (todayRes.data.appointments || []).filter(a => a.paymentStatus === 'paid');
        setTodaySessions(paid);
        setPatients(patientsRes.data.patients?.slice(0, 5) || []);
        setAnalytics(analyticsRes.data || null);
        setTotalUnreadMessages((messagesRes.data.conversations || []).reduce((s, c) => s + (c.unreadCount || 0), 0));
        setNotifications(notifRes.data.notifications || []);
        setUnreadCount(notifRes.data.unreadCount || 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (n) => { setNotifications(p => [n, ...p].slice(0, 50)); setUnreadCount(p => p + 1); };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, []);

  useEffect(() => {
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleBellClick = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadCount > 0) {
      await notificationAPI.markAllRead().catch(() => {});
      setNotifications(p => p.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  // Derived session counts
  const sessionedSessions = todaySessions.map(s => ({ ...s, ...getSessionMeta(s) }))
    .sort((a, b) => {
      if (a.isOngoing && !b.isOngoing) return -1;
      if (!a.isOngoing && b.isOngoing) return 1;
      if (a.isUpcoming && b.isPast) return -1;
      if (a.isPast && b.isUpcoming) return 1;
      return a.aptDate - b.aptDate;
    });

  const ongoingCount  = sessionedSessions.filter(s => s.isOngoing).length;
  const remainingCount = sessionedSessions.filter(s => s.isUpcoming).length;
  const completedCount = sessionedSessions.filter(s => s.isPast && s.display !== 'Cancelled').length;

  const getRiskBadge = (level) => ({
    low:    'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    high:   'bg-danger/10 text-danger',
  }[level] || 'bg-success/10 text-success');

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={adminLinks} userRole="admin" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-7xl mx-auto">

          {/* ── Hero Banner ──────────────────────────────────────────────── */}
          <div className="relative mb-6">
            <motion.div variants={fadeInUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-emerald-500 to-teal-600 p-5 md:p-8 shadow-soft-xl">
              <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-12 -left-6 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

              <div className="relative flex items-start justify-between gap-4">
                {/* Left — greeting + today summary */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <greeting.icon className="w-4 h-4 text-white/60" />
                    <span className="text-white/60 text-xs">{greeting.text}</span>
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-white mb-1">
                    Dr. {(user?.name || 'Doctor').replace(/^dr\.?\s*/i, '').split(' ')[0]} 
                  </h1>

                </div>

                {/* Right — notification bell (desktop) + doctor avatar */}
                <div className="flex items-start gap-3 flex-shrink-0">
                  {/* Doctor profile chip */}
                  <div className="hidden md:flex flex-col items-center gap-1">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden shadow-soft">
                      {user?.profilePic
                        ? <img src={user.profilePic} alt={user.name} className="w-full h-full object-cover" />
                        : <Stethoscope className="w-8 h-8 text-white" />}
                    </div>
                    <span className="text-white/60 text-[10px] font-medium">{user?.specialization || 'Therapist'}</span>
                  </div>

                  {/* Bell — desktop only */}
                  <div className="hidden lg:block" ref={notifRef}>
                    <button
                      onClick={handleBellClick}
                      className="relative p-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all border border-white/20"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Notification panel — outside hero so overflow:hidden doesn't clip */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute top-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary text-sm">Notifications</h3>
                    {notifications.length > 0 && <span className="text-xs text-text-secondary">{notifications.length} total</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={async () => {
                          if (!n.read) {
                            await notificationAPI.markOneRead(n._id).catch(() => {});
                            setNotifications(p => p.map(x => x._id === n._id ? { ...x, read: true } : x));
                            setUnreadCount(p => Math.max(0, p - 1));
                          }
                          setShowNotifications(false);
                          if (n.link) navigate(n.link);
                        }}
                        className={`p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors ${!n.read ? 'bg-primary-light/30' : ''}`}
                      >
                        <div className="flex justify-between gap-2">
                          <p className={`text-sm ${!n.read ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>{n.title}</p>
                          {!n.read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-text-secondary/50 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    )) : (
                      <p className="text-center text-sm text-text-secondary py-6">No new notifications</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Stats Row ─────────────────────────────────────────────────── */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'Total Patients', icon: Users, color: 'from-primary to-emerald-400',
                value: loading ? '–' : analytics?.totalPatients || '0',
                sub: 'All time',
                link: '/admin/patients',
              },
              {
                label: "Today's Sessions", icon: Clock, color: 'from-secondary to-purple-400',
                value: loading ? '–' : todaySessions.length,
                sub: `${ongoingCount} ongoing · ${remainingCount} upcoming`,
                link: '/admin/calendar',
              },
              {
                label: 'Unread Messages', icon: MessageCircle, color: 'from-pink-500 to-rose-400',
                value: loading ? '–' : totalUnreadMessages,
                sub: totalUnreadMessages > 0 ? 'Tap to reply' : 'All caught up ✓',
                link: '/admin/messages',
              },
              {
                label: 'Total Sessions', icon: BarChart3, color: 'from-amber-500 to-orange-400',
                value: loading ? '–' : analytics?.totalSessions || '0',
                sub: `${analytics?.completedSessions || 0} completed`,
                link: '/admin/analytics',
              },
            ].map(s => (
              <Link key={s.label} to={s.link}>
                <motion.div whileHover={{ y: -3 }} className="card h-full cursor-pointer group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-soft`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-display font-bold text-text-primary">{s.value}</p>
                  <p className="text-sm font-semibold text-text-primary mt-0.5">{s.label}</p>
                  <p className="text-xs text-text-secondary/70 mt-1 leading-snug">{s.sub}</p>
                </motion.div>
              </Link>
            ))}
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-5">

              {/* ── Today's Sessions ──────────────────────────────────────── */}
              <motion.div variants={fadeInUp} className="lg:col-span-2 card">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-display font-bold text-lg text-text-primary">Today's Sessions</h2>
                    <p className="text-xs text-text-secondary mt-0.5">{new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <Link to="/admin/calendar" className="text-sm text-primary font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all">
                    Calendar <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {sessionedSessions.length > 0 ? (
                  <div className="space-y-2">
                    {sessionedSessions.map(session => (
                      <motion.div
                        key={session._id}
                        whileHover={{ x: 3 }}
                        onClick={() => session.patient?._id && navigate(`/admin/patients?selected=${session.patient._id}`)}
                        className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer ${
                          session.isOngoing
                            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
                            : session.isPast
                            ? 'bg-gray-50/50 border border-gray-100 opacity-70'
                            : 'bg-gray-50/50 border border-gray-100 hover:border-primary/20 hover:bg-primary-light/20'
                        }`}
                      >
                        {/* Patient avatar */}
                        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {session.patient?.profilePic
                            ? <img src={session.patient.profilePic} alt={session.patient.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                            : null}
                          <span className={`text-xs font-bold text-primary ${session.patient?.profilePic ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                            {((session.patient?.name || 'P')).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{session.patient?.name || 'Patient'}</p>
                          <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {session.time} · {session.duration || 50} min
                          </p>
                        </div>

                        {/* Status / Action */}
                        {session.isOngoing && session.meetingLink ? (
                          <Link
                            to={session.meetingLink}
                            onClick={e => e.stopPropagation()}
                            className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1 shadow-glow flex-shrink-0"
                          >
                            <Video className="w-3.5 h-3.5" /> Start
                          </Link>
                        ) : (
                          <span className={`text-xs px-2.5 py-1 rounded-xl font-semibold whitespace-nowrap flex-shrink-0 ${
                            session.display === 'Ongoing'   ? 'bg-amber-100 text-amber-700' :
                            session.display === 'Ended'     ? 'bg-success/10 text-success' :
                            session.display === 'Expired'   ? 'bg-gray-100 text-text-secondary' :
                            session.display === 'Cancelled' ? 'bg-danger/10 text-danger' :
                            'bg-primary/10 text-primary'
                          }`}>{session.display}</span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-text-primary">No sessions today</p>
                    <p className="text-xs text-text-secondary mt-1">Check the calendar to manage availability.</p>
                  </div>
                )}
              </motion.div>

              {/* ── Right Column ──────────────────────────────────────────── */}
              <div className="space-y-5">

                {/* Recent Patients */}
                <motion.div variants={fadeInUp} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-bold text-base text-text-primary">Recent Patients</h2>
                    <Link to="/admin/patients" className="text-xs text-primary font-medium flex items-center gap-0.5">
                      View All <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {patients.length > 0 ? patients.map(patient => (
                      <motion.div
                        key={patient._id}
                        whileHover={{ x: 3 }}
                        onClick={() => navigate(`/admin/patients?selected=${patient._id}`)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center overflow-hidden flex-shrink-0">
                          {patient.profilePic
                            ? <img src={patient.profilePic} alt={patient.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                            : null}
                          <span className={`text-xs font-bold text-primary ${patient.profilePic ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                            {(patient.name || 'P').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                            {patient.name || 'Patient'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-text-secondary">{patient.sessions || 0} sessions</span>
                            {patient.moodScore && (
                              <>
                                <span className="text-text-secondary/30">·</span>
                                <span className="text-[10px] text-text-secondary">Mood {patient.moodScore}/10</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${getRiskBadge(patient.riskLevel)}`}>
                            {patient.riskLevel === 'high' && <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />}
                            {patient.riskLevel || 'low'}
                          </span>
                          {patient.moodTrend && patient.moodTrend !== 'stable' && (
                            <span className={`text-[9px] font-medium ${patient.moodTrend === 'up' ? 'text-success' : 'text-danger'}`}>
                              {patient.moodTrend === 'up' ? '↑ Improving' : '↓ Declining'}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-5">
                        <UserCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-text-secondary">No patients yet</p>
                      </div>
                    )}
                  </div>
                </motion.div>

              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;