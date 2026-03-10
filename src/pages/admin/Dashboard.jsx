import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
  Video, Clock, TrendingUp, AlertTriangle, ArrowRight, Bell
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, patientAPI } from '../../services/api';

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
  { name: 'Messages', path: '/admin/messages', icon: MessageCircle, badge: '5' },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [todaySessions, setTodaySessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, patientsRes, analyticsRes] = await Promise.all([
          appointmentAPI.getToday().catch(() => ({ data: { appointments: [] } })),
          patientAPI.getAll().catch(() => ({ data: { patients: [] } })),
          patientAPI.getAnalytics().catch(() => ({ data: {} })),
        ]);
        setTodaySessions(todayRes.data.appointments || []);
        setPatients(patientsRes.data.patients?.slice(0, 4) || []);
        setAnalytics(analyticsRes.data || null);
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
    { label: 'Sessions Today', value: todaySessions.length, change: `${todaySessions.filter(s => s.status !== 'completed').length} remaining`, icon: Video, color: 'from-secondary to-purple-400' },
    { label: 'Revenue', value: analytics?.totalRevenue ? `₹${(analytics.totalRevenue / 1000).toFixed(0)}K` : '—', change: 'Total', icon: TrendingUp, color: 'from-amber-500 to-orange-400' },
    { label: 'Total Sessions', value: analytics?.totalSessions || '—', change: 'Completed', icon: BarChart3, color: 'from-pink-500 to-rose-400' },
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
                    {todaySessions.map((session) => {
                      const aptDate = new Date(session.date);
                      const [tPart, tPeriod] = (session.time || '').split(' ');
                      let [tH, tM] = (tPart || '0:0').split(':').map(Number);
                      if (tPeriod === 'PM' && tH !== 12) tH += 12;
                      if (tPeriod === 'AM' && tH === 12) tH = 0;
                      aptDate.setHours(tH, tM || 0, 0, 0);
                      const now = new Date();
                      const diff = (aptDate - now) / 60000;
                      const isExpired = diff <= -(session.duration || 50);
                      const isJoinable = diff <= 15 && !isExpired;

                      const displayStatus = isExpired && session.status === 'scheduled' ? 'expired' : session.status;

                      return (
                        <div key={session._id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl flex-shrink-0">
                            👤
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{session.patient?.name}</p>
                            <p className="text-xs text-text-secondary flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {session.time} • {session.duration || 50} min
                            </p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${displayStatus === 'expired' ? 'bg-gray-100 text-text-secondary' : getStatusBadge(session.status)}`}>
                            {displayStatus}
                          </span>
                          {session.meetingLink && isJoinable && (session.status === 'upcoming' || session.status === 'scheduled') && (
                            <Link to={session.meetingLink || '#'} className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1">
                              <Video className="w-3.5 h-3.5" /> Start
                            </Link>
                          )}
                        </div>
                      )
                    })}
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
