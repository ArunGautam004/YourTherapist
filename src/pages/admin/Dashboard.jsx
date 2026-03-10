import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
  Video, Clock, TrendingUp, AlertTriangle, ArrowRight, Bell, ClipboardList
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, patientAPI, messageAPI } from '../../services/api';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const adminLinks = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Patients', path: '/admin/patients', icon: Users },
  { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { name: 'Questionnaires', path: '/admin/questionnaires', icon: ClipboardList },
  { name: 'Messages', path: '/admin/messages', icon: MessageCircle, badge: '5' },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [todaySessions, setTodaySessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, patientsRes, analyticsRes, messagesRes] = await Promise.all([
          appointmentAPI.getToday().catch(() => ({ data: { appointments: [] } })),
          patientAPI.getAll().catch(() => ({ data: { patients: [] } })),
          patientAPI.getAnalytics().catch(() => ({ data: {} })),
          messageAPI.getConversations().catch(() => ({ data: { conversations: [] } })),
        ]);
        setTodaySessions(todayRes.data.appointments || []);
        setPatients(patientsRes.data.patients?.slice(0, 4) || []);
        setAnalytics(analyticsRes.data || null);

        const unread = (messagesRes.data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setTotalUnreadMessages(unread);
      } catch (err) {
        console.error('Admin dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { label: 'Total Patients', value: analytics?.totalPatients || '—', change: 'All time', icon: Users, color: 'from-primary to-emerald-400' },
    {
      label: 'Sessions Today',
      value: todaySessions.filter(s => s.status !== 'cancelled' && s.paymentStatus === 'paid').length,
      change: 'Total scheduled',
      icon: Clock,
      color: 'from-secondary to-purple-400'
    },
    {
      label: 'Remaining Today',
      value: todaySessions.filter(s => {
        const aptDate = new Date(s.date);
        const [tPart, tPeriod] = (s.time || '').split(' ');
        let [tH, tM] = (tPart || '0:0').split(':').map(Number);
        if (tPeriod === 'PM' && tH !== 12) tH += 12;
        if (tPeriod === 'AM' && tH === 12) tH = 0;
        aptDate.setHours(tH, tM || 0, 0, 0);

        const endTime = new Date(aptDate.getTime() + (s.duration || 50) * 60000);
        const now = new Date();
        const diff = (aptDate - now) / 60000;

        // Ongoing = within 10 mins of start OR has started and not yet ended
        const isOngoing = diff <= 10 && now < endTime && s.status !== 'cancelled';
        const isUpcoming = aptDate > now && s.status !== 'cancelled';

        return (isOngoing || isUpcoming) && !['completed', 'no-show'].includes(s.status);
      }).length,
      change: 'Ongoing & Upcoming',
      icon: Video,
      color: 'from-amber-500 to-orange-400'
    },
    {
      label: 'Total Sessions',
      value: analytics?.totalSessions || '—',
      change: `Comp/Ongoing: ${analytics?.completedSessions || 0} | Upcoming: ${analytics?.upcomingSessions || 0}`,
      icon: BarChart3,
      color: 'from-pink-500 to-rose-400'
    },
  ];

  const getRiskBadge = (level) => {
    const styles = { low: 'bg-success/10 text-success', medium: 'bg-warning/10 text-warning', high: 'bg-danger/10 text-danger' };
    return styles[level] || styles.low;
  };

  const getStatusBadge = (status) => {
    const styles = { completed: 'bg-success/10 text-success', upcoming: 'bg-primary/10 text-primary', scheduled: 'bg-gray-100 text-text-secondary', 'in-progress': 'bg-primary/10 text-primary' };
    return styles[status] || styles.scheduled;
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Patient', desc: 'A new patient has registered', time: '10 min ago', read: false }
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
      <Sidebar links={adminLinks} userRole="admin" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-7xl mx-auto">
          <motion.div variants={fadeInUp} className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
                {getGreeting()}, <span className="gradient-text">{user?.name || 'Doctor'}</span> 👋
              </h1>
              <p className="text-text-secondary mt-1">Here's your practice overview for today.</p>
            </div>

            {/* Notification Dropdown */}
            <div className="relative">
              <Link
                to="/admin/messages"
                className={`hidden md:flex p-2.5 rounded-2xl bg-white shadow-soft transition-all relative ${totalUnreadMessages > 0 ? 'bg-primary-light ring-2 ring-primary ring-offset-2' : 'hover:shadow-soft-lg'}`}
              >
                <Bell className={`w-5 h-5 ${totalUnreadMessages > 0 ? 'text-primary' : 'text-text-secondary'}`} />
                {totalUnreadMessages > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" />
                    <motion.span
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1 w-full h-full rounded-2xl bg-primary opacity-20 pointer-events-none"
                    />
                  </>
                )}
              </Link>

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

          {/* Stats Grid */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="card group hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-soft mb-3`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-display font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-secondary">{stat.label}</p>
                <p className="text-xs text-success font-medium mt-1">{stat.change}</p>
              </div>
            ))}
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Today's Sessions */}
              <motion.div variants={fadeInUp} className="lg:col-span-3 card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-lg text-text-primary">Today's Sessions</h2>
                  <Link to="/admin/calendar" className="text-sm text-primary font-medium hover:text-primary-dark flex items-center gap-1">
                    Full Calendar <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                {todaySessions.length > 0 ? (
                  <div className="space-y-2">
                    {todaySessions
                      .map((session) => {
                        let aptDate = new Date();
                        if (session.date) {
                          const safeDate = new Date(session.date);
                          if (!isNaN(safeDate)) {
                            const localY = safeDate.getFullYear();
                            const localM = safeDate.getMonth();
                            const localD = safeDate.getDate();

                            const [tPart, tPeriod] = (session.time || '').split(' ');
                            let [tH, tM] = (tPart || '0:0').split(':').map(Number);
                            if (tPeriod === 'PM' && tH !== 12) tH += 12;
                            if (tPeriod === 'AM' && tH === 12) tH = 0;

                            aptDate = new Date(localY, localM, localD, tH, tM || 0, 0, 0);
                          }
                        }
                        const endTime = new Date(aptDate.getTime() + (session.duration || 50) * 60000);
                        const now = new Date();
                        const diff = (aptDate - now) / 60000;

                        // Ongoing = within 10 mins of start OR has started and not yet ended
                        const isOngoing = diff <= 10 && now < endTime && session.status !== 'cancelled';
                        const isPast = ['completed', 'cancelled', 'no-show'].includes(session.status) || now >= endTime;
                        const isUpcoming = aptDate > now && !isPast && !isOngoing;

                        let displayStatus = session.status;
                        if (session.status === 'cancelled') {
                          displayStatus = 'cancelled';
                        } else if (isPast) {
                          displayStatus = session.patientJoined ? 'ended' : 'expired';
                          if (session.status === 'completed') displayStatus = 'completed';
                        } else if (isOngoing) {
                          displayStatus = 'ongoing';
                        }

                        return { ...session, isOngoing, isPast, isUpcoming, displayStatus, aptDate };
                      })
                      .sort((a, b) => {
                        // Ongoing first, then upcoming, then past
                        if (a.isOngoing && !b.isOngoing) return -1;
                        if (!a.isOngoing && b.isOngoing) return 1;
                        if (a.isUpcoming && b.isPast) return -1;
                        if (a.isPast && b.isUpcoming) return 1;
                        return a.aptDate - b.aptDate;
                      })
                      .map((session) => (
                        <div key={session._id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                            {session.patient?.profilePic ? (
                              <img src={session.patient.profilePic} alt={session.patient.name} className="w-full h-full object-cover" />
                            ) : (
                              '👤'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{session.patient?.name}</p>
                            <p className="text-xs text-text-secondary flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {session.time} • {session.duration || 50} min
                            </p>
                          </div>
                          {session.displayStatus !== 'ongoing' && (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${session.displayStatus === 'expired' ? 'bg-gray-100 text-text-secondary' :
                              session.displayStatus === 'ended' ? 'bg-success/10 text-success' :
                                getStatusBadge(session.status)
                              }`}>
                              {session.displayStatus}
                            </span>
                          )}
                          {session.meetingLink && session.isOngoing && (
                            <Link to={session.meetingLink || '#'} className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1">
                              <Video className="w-3.5 h-3.5" /> Start
                            </Link>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-text-secondary text-sm">No sessions scheduled for today</p>
                )}
              </motion.div>

              {/* Recent Patients */}
              <motion.div variants={fadeInUp} className="lg:col-span-2 card">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-lg text-text-primary">Recent Patients</h2>
                  <Link to="/admin/patients" className="text-sm text-primary font-medium hover:text-primary-dark flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {patients.map((patient) => (
                    <div key={patient._id} className="p-3 rounded-2xl bg-gray-50 hover:bg-primary-light/20 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl">
                          👤
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{patient.name}</p>
                          <p className="text-xs text-text-secondary">{patient.sessions || 0} sessions</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskBadge(patient.riskLevel)}`}>
                          {patient.riskLevel === 'high' && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                          {patient.riskLevel || 'low'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-secondary pl-[52px]">
                        <span>Mood: {patient.moodScore || '—'}/10</span>
                        <span className={patient.moodTrend === 'up' ? 'text-success' : patient.moodTrend === 'down' ? 'text-danger' : 'text-warning'}>
                          {patient.moodTrend === 'up' ? '↑ Improving' : patient.moodTrend === 'down' ? '↓ Declining' : '→ Stable'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {patients.length === 0 && (
                    <p className="text-center py-6 text-text-secondary text-sm">No patients yet</p>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
