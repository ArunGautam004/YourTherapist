// src/pages/patient/Dashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, BookOpen, MessageCircle, Video, Clock, Heart, Flame, TrendingUp, TrendingDown,
  Sun, Moon, ChevronRight, Sparkles, Wind, Activity, Star, Shield, Bell
} from 'lucide-react';
import PatientSidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, messageAPI, moodAPI, notificationAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger  = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Good Night',     icon: Moon };
  if (h < 12) return { text: 'Good Morning',   icon: Sun };
  if (h < 17) return { text: 'Good Afternoon', icon: Sun };
  return       { text: 'Good Evening',         icon: Moon };
};

const WELLNESS_TIPS = [
  { tip: "Take 3 deep breaths before your next session.", icon: Wind },
  { tip: "A 10-minute walk can improve mood by up to 30%.", icon: Activity },
  { tip: "Journaling daily strengthens emotional resilience.", icon: BookOpen },
  { tip: "Sleep 7–9 hours — it's your brain's recovery time.", icon: Moon },
  { tip: "You are making progress, even on the hard days.", icon: Sparkles },
  { tip: "Small consistent steps beat big rare leaps.", icon: TrendingUp },
  { tip: "Gratitude practice rewires the brain for positivity.", icon: Star },
  { tip: "Reaching out for help is a sign of strength.", icon: Shield },
];

const MOOD_EMOJI = { 1:'😢', 2:'😟', 3:'😟', 4:'😐', 5:'😐', 6:'😊', 7:'😊', 8:'😄', 9:'🤩', 10:'🤩' };

const getMoodBg = (score) => {
  if (!score) return 'from-gray-100 to-gray-50';
  if (score <= 3) return 'from-red-100 to-rose-50';
  if (score <= 5) return 'from-orange-100 to-amber-50';
  if (score <= 7) return 'from-yellow-100 to-lime-50';
  return 'from-green-100 to-emerald-50';
};

const getMoodLabel = (score) => {
  if (!score) return 'Not logged yet';
  if (score <= 2) return 'Struggling';
  if (score <= 4) return 'Low';
  if (score <= 6) return 'Okay';
  if (score <= 8) return 'Good';
  return 'Excellent';
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [moodStats, setMoodStats]     = useState(null);
  const [moodEntries, setMoodEntries] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [tip] = useState(() => WELLNESS_TIPS[Math.floor(Math.random() * WELLNESS_TIPS.length)]);
  const navigate = useNavigate();
  const greeting = getGreeting();

  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [aptRes, msgRes, moodRes, notifRes] = await Promise.all([
          appointmentAPI.getAll().catch(() => ({ data: { appointments: [] } })),
          messageAPI.getConversations().catch(() => ({ data: { conversations: [] } })),
          moodAPI.getEntries(14).catch(() => ({ data: { stats: null, entries: [] } })),
          notificationAPI.getAll().catch(() => ({ data: { notifications: [], unreadCount: 0 } })),
        ]);

        const all = (aptRes.data.appointments || []).filter(a => a.paymentStatus === 'paid');
        const now = new Date();
        const upcoming = all.filter(apt => {
          const d = new Date(apt.date);
          const [tp, per] = (apt.time || '').split(' ');
          let [h, m] = (tp || '0:0').split(':').map(Number);
          if (per === 'PM' && h !== 12) h += 12;
          if (per === 'AM' && h === 12) h = 0;
          d.setHours(h, m || 0, 0, 0);
          return apt.status !== 'cancelled' && now < new Date(d.getTime() + (apt.duration || 50) * 60000);
        }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);

        setUpcomingSessions(upcoming);
        setTotalUnread((msgRes.data.conversations || []).reduce((s, c) => s + (c.unreadCount || 0), 0));
        setMoodStats(moodRes.data.stats || null);
        setMoodEntries((moodRes.data.entries || []).slice(0, 14));
        setNotifications(notifRes.data.notifications || []);
        setUnreadNotifCount(notifRes.data.unreadCount || 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (n) => {
      setNotifications(p => [n, ...p].slice(0, 50));
      setUnreadNotifCount(p => p + 1);
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, []);

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
    if (opening && unreadNotifCount > 0) {
      await notificationAPI.markAllRead().catch(() => {});
      setNotifications(p => p.map(n => ({ ...n, read: true })));
      setUnreadNotifCount(0);
    }
  };

  const timeAgo = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60)    return 'just now';
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const getSessionStatus = (apt) => {
    const d = new Date(apt.date);
    const [tp, per] = (apt.time || '').split(' ');
    let [h, m] = (tp || '0:0').split(':').map(Number);
    if (per === 'PM' && h !== 12) h += 12;
    if (per === 'AM' && h === 12) h = 0;
    d.setHours(h, m || 0, 0, 0);
    const end = new Date(d.getTime() + (apt.duration || 50) * 60000);
    const now = new Date();
    const diff = (d - now) / 60000;
    const isOngoing = diff <= 10 && now < end;
    const display = isOngoing ? 'Live Now' :
      diff <= 60   ? `In ${Math.ceil(diff)}m` :
      diff <= 1440 ? `In ${Math.floor(diff / 60)}h` :
      `In ${Math.floor(diff / 1440)}d`;
    return { isOngoing, display };
  };

  const wellnessScore = (() => {
    const mood    = parseFloat(moodStats?.avgMood || 0);
    const streak  = Math.min(moodStats?.streak || 0, 7);
    const sessions = Math.min(upcomingSessions.length, 3);
    return Math.round((mood / 10) * 50 + (streak / 7) * 30 + (sessions / 3) * 20);
  })();

  const todayMood = moodEntries.find(e => new Date(e.date).toDateString() === new Date().toDateString());
  const nextSession = upcomingSessions;
  const nextSessionDate = nextSession
    ? new Date(nextSession.date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <PatientSidebar unreadMessages={totalUnread} />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-5xl mx-auto">
          <div className="relative mb-6">
            <motion.div variants={fadeInUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-emerald-500 to-teal-600 p-5 md:p-8 shadow-soft-xl">
              <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-14 -left-6 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

              <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <greeting.icon className="w-4 h-4 text-white/60" />
                      <span className="text-white/60 text-xs">{greeting.text}</span>
                    </div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-white">
                      {user?.name?.split(' ') || 'Welcome'} 
                    </h1>
                  </div>

                  <div className="hidden lg:block flex-shrink-0" ref={notifRef}>
                    <button
                      onClick={handleBellClick}
                      className="relative p-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all border border-white/20"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadNotifCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                          {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${getMoodBg(todayMood?.score)} flex flex-col items-center justify-center shadow-soft border border-white/20`}>
                      <span className="text-2xl md:text-3xl">{todayMood ? (MOOD_EMOJI[todayMood.score] || '😐') : '❓'}</span>
                      <span className="text-[9px] md:text-[10px] font-semibold text-text-primary mt-0.5">{getMoodLabel(todayMood?.score)}</span>
                    </div>
                    <span className="text-white/60 text-[10px] font-medium">Today's mood</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="relative w-16 h-16 md:w-20 md:h-20">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="30"
                          fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 30}`}
                          strokeDashoffset={`${2 * Math.PI * 30 * (1 - (loading ? 0 : wellnessScore) / 100)}`}
                          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display font-bold text-white text-sm md:text-base leading-none">
                          {loading ? '–' : `${wellnessScore}%`}
                        </span>
                      </div>
                    </div>
                    <span className="text-white/60 text-[10px] font-medium">Wellness</span>
                  </div>
                </div>
              </div>
            </motion.div>

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
                    {notifications.length > 0 && (
                      <span className="text-xs text-text-secondary">{notifications.length} total</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={async () => {
                          if (!n.read) {
                            await notificationAPI.markOneRead(n._id).catch(() => {});
                            setNotifications(p => p.map(x => x._id === n._id ? { ...x, read: true } : x));
                            setUnreadNotifCount(p => Math.max(0, p - 1));
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
                      <p className="text-center text-sm text-text-secondary py-6">No notifications yet</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'Mood Streak',
                icon: Flame, color: 'from-orange-400 to-amber-500', link: '/patient/journal',
                value: loading ? '–' : String(moodStats?.streak || 0),
                unit: 'days',
                sub: (moodStats?.streak || 0) >= 7 ? '🏆 Week streak!' : (moodStats?.streak || 0) >= 3 ? '🌟 Keep it up!' : 'Log daily to build',
              },
              {
                label: 'Avg Mood',
                icon: Heart, color: 'from-rose-400 to-pink-500', link: '/patient/journal',
                value: loading ? '–' : moodStats?.avgMood || '–',
                unit: moodStats?.avgMood ? '/10' : '',
                sub: moodStats?.changePercent
                  ? `${moodStats.changePercent > 0 ? '↑' : '↓'} ${Math.abs(moodStats.changePercent)}% vs last week`
                  : 'This week',
              },
              {
                label: 'Upcoming Sessions',
                icon: Calendar, color: 'from-primary to-teal-500', link: '/patient/sessions',
                value: loading ? '–' : String(upcomingSessions.length),
                unit: '',
                sub: nextSessionDate || 'None scheduled',
              },
              {
                label: 'Unread Messages',
                icon: MessageCircle, color: 'from-secondary to-purple-500', link: null,
                value: loading ? '–' : String(totalUnread),
                unit: '',
                sub: totalUnread > 0 ? 'New messages waiting' : 'All caught up ✓',
              },
            ].map(s => {
              const cardContent = (
                <motion.div whileHover={{ y: -3 }} className={`card h-full ${s.link ? 'cursor-pointer' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-soft`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-display font-bold text-text-primary">{s.value}</p>
                    {s.unit && <p className="text-xs text-text-secondary">{s.unit}</p>}
                  </div>
                  <p className="text-sm font-semibold text-text-primary mt-0.5">{s.label}</p>
                  <p className="text-xs text-text-secondary/70 mt-1 leading-snug">{s.sub}</p>
                </motion.div>
              );
              return s.link
                ? <Link key={s.label} to={s.link}>{cardContent}</Link>
                : <div key={s.label}>{cardContent}</div>;
            })}
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-5">
              <motion.div variants={fadeInUp} className="lg:col-span-2 card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-lg text-text-primary">Upcoming Sessions</h2>
                  <Link to="/patient/sessions" className="text-sm text-primary font-medium flex items-center gap-0.5 hover:gap-1.5 transition-all">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {upcomingSessions.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingSessions.map(apt => {
                      const { isOngoing, display } = getSessionStatus(apt);
                      const drName = apt.doctor?.name
                        ? (apt.doctor.name.toLowerCase().startsWith('dr') ? apt.doctor.name : `Dr. ${apt.doctor.name}`)
                        : 'Your Therapist';
                      const dateStr = new Date(apt.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
                      return (
                        <motion.div key={apt._id} whileHover={{ x: 3 }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                            isOngoing
                              ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-soft'
                              : 'bg-gray-50/50 border-gray-100 hover:border-primary/20 hover:bg-primary-light/20'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0 overflow-hidden shadow-soft">
                            {apt.doctor?.profilePic
                              ? <img src={apt.doctor.profilePic} alt={drName} className="w-full h-full object-cover" />
                              : <span className="text-xl">👨‍⚕️</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text-primary text-sm">{drName}</p>
                            <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3" /> {dateStr} • {apt.time}
                            </p>
                            {apt.type && (
                              <span className="text-[10px] uppercase tracking-wider text-primary font-medium capitalize">{apt.type}</span>
                            )}
                          </div>
                          {isOngoing && apt.meetingLink ? (
                            <Link to={apt.meetingLink} className="btn-primary !px-4 !py-2 text-xs flex items-center gap-1.5 shadow-glow flex-shrink-0">
                              <Video className="w-3.5 h-3.5" /> Join Now
                            </Link>
                          ) : (
                            <span className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap flex-shrink-0 ${
                              display.includes('m') ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                            }`}>{display}</span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-text-primary">No upcoming sessions</p>
                    <p className="text-xs text-text-secondary mt-1">Use <span className="font-semibold text-primary">Book Appointment</span> in the sidebar.</p>
                  </div>
                )}
              </motion.div>

              <div className="space-y-4">
                <motion.div variants={fadeInUp} className="card bg-gradient-to-br from-primary-light/60 to-teal-50 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <tip.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Daily Tip ✨</p>
                      <p className="text-sm text-text-primary leading-relaxed">{tip.tip}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={fadeInUp} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-text-primary text-sm">Mood This Week</h3>
                    <Link to="/patient/journal" className="text-xs text-primary font-medium flex items-center gap-0.5">
                      Open Journal <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {moodEntries.length > 0 ? (
                    <>
                      <div className="flex items-end gap-1.5 h-16 mb-2">
                        {Array.from({ length: 7 }).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (6 - i));
                          const entry = moodEntries.find(e => new Date(e.date).toDateString() === d.toDateString());
                          const today = i === 6;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <div
                                title={entry ? `${entry.label} (${entry.score}/10)` : 'No entry'}
                                className={`w-full rounded-t-lg transition-all duration-500 ${
                                  entry
                                    ? entry.score >= 7 ? 'bg-green-400'
                                    : entry.score >= 5 ? 'bg-amber-400'
                                    : 'bg-red-400'
                                    : 'bg-gray-200'
                                } ${today ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                style={{ height: entry ? `${(entry.score / 10) * 100}%` : '10%', minHeight: 4 }}
                              />
                              <span className={`text-[9px] font-medium ${today ? 'text-primary font-bold' : 'text-text-secondary'}`}>
                                {d.toLocaleDateString('en', { weekday: 'narrow' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {[['bg-green-400','Good'], ['bg-amber-400','Okay'], ['bg-red-400','Low']].map(([c, l]) => (
                          <div key={l} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${c}`} />
                            <span className="text-[9px] text-text-secondary">{l}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-xs text-text-secondary">No mood entries this week.</p>
                      <p className="text-xs text-text-secondary/60 mt-1">Visit Mood Journal to start tracking.</p>
                    </div>
                  )}
                </motion.div>

                {moodStats && (
                  <motion.div variants={fadeInUp} className="card">
                    <h3 className="font-display font-bold text-text-primary text-sm mb-3">Wellness Summary</h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Avg mood (7 days)</span>
                        <span className="text-sm font-bold text-text-primary">{moodStats.avgMood || '–'} / 10</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Entries logged</span>
                        <span className="text-sm font-bold text-text-primary">{moodStats.totalEntries || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Week-on-week</span>
                        <span className={`text-sm font-bold flex items-center gap-1 ${
                          moodStats.changePercent > 0 ? 'text-green-500' :
                          moodStats.changePercent < 0 ? 'text-red-400' : 'text-text-secondary'
                        }`}>
                          {moodStats.changePercent > 0
                            ? <TrendingUp className="w-3.5 h-3.5" />
                            : moodStats.changePercent < 0
                            ? <TrendingDown className="w-3.5 h-3.5" />
                            : null}
                          {moodStats.changePercent
                            ? `${moodStats.changePercent > 0 ? '+' : ''}${moodStats.changePercent}%`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PatientDashboard;