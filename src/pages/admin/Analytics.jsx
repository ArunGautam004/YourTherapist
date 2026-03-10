import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
  TrendingUp, AlertTriangle
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { patientAPI, messageAPI } from '../../services/api';

const adminLinks = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Patients', path: '/admin/patients', icon: Users },
  { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { name: 'Messages', path: '/admin/messages', icon: MessageCircle, badge: '5' },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [{ data }, { data: msgData }] = await Promise.all([
          patientAPI.getAnalytics(),
          messageAPI.getConversations().catch(() => ({ data: { conversations: [] } }))
        ]);
        setAnalytics(data);
        const unread = (msgData.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setTotalUnread(unread);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const dynamicLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Patients', path: '/admin/patients', icon: Users },
    { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Messages', path: '/admin/messages', icon: MessageCircle, badge: totalUnread > 0 ? totalUnread.toString() : null },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar links={dynamicLinks} userRole="admin" />
        <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    { label: 'Total Patients', value: analytics?.totalPatients || '—', icon: Users, color: 'from-primary to-emerald-400' },
    {
      label: 'Total Sessions',
      value: analytics?.totalSessions || '—',
      detail: `Comp/Ongoing: ${analytics?.completedSessions || 0} | Upcoming: ${analytics?.upcomingSessions || 0}`,
      icon: BarChart3,
      color: 'from-secondary to-purple-400'
    },
    {
      label: 'Total Revenue',
      value: analytics?.totalRevenue ? `₹${analytics.totalRevenue >= 100000 ? (analytics.totalRevenue / 100000).toFixed(1) + 'L' : analytics.totalRevenue >= 1000 ? (analytics.totalRevenue / 1000).toFixed(1) + 'K' : analytics.totalRevenue}` : '—',
      detail: `Comp: ₹${analytics?.completedRevenue?.toLocaleString() || 0} | Pend: ₹${analytics?.pendingRevenue?.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-400'
    },
    {
      label: 'Revenue Today',
      value: analytics?.totalRevenueToday ? `₹${analytics.totalRevenueToday.toLocaleString()}` : '₹0',
      icon: Calendar,
      color: 'from-pink-500 to-rose-400'
    },
  ];

  const maxSessions = analytics?.monthlyData ? Math.max(...analytics.monthlyData.map(m => m.sessions), 1) : 1;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={dynamicLinks} userRole="admin" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Practice <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-text-secondary mb-8">Insights into your practice performance</p>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((metric) => (
              <div key={metric.label} className="card group hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-soft mb-3`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-display font-bold text-text-primary">{metric.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-text-secondary">{metric.label}</p>
                  {metric.detail && (
                    <span className="text-[10px] font-medium text-success opacity-90 px-1.5 py-0.5 rounded-full bg-success/10 border border-success/20">
                      {metric.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Session Trend Chart */}
            <div className="lg:col-span-3 card">
              <h2 className="font-display font-bold text-lg text-text-primary mb-6">Session Overview</h2>
              <div className="flex items-end justify-between gap-2" style={{ height: 200 }}>
                {(analytics?.monthlyData || []).map((month, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-text-secondary font-medium">{month.sessions}</span>
                    <div className="w-full max-w-[60px] rounded-t-xl bg-gradient-to-t from-primary to-primary/60 transition-all duration-500"
                      style={{ height: `${(month.sessions / maxSessions) * 160}px`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-text-secondary">{month.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Orders & Revenue Chart */}
            <div className="lg:col-span-2 card">
              <h2 className="font-display font-bold text-lg text-text-primary mb-5">Daily Revenue</h2>
              {(analytics?.dailyData || []).length > 0 ? (
                <div className="flex items-end justify-between h-48 gap-2 mt-4 pb-6">
                  {analytics.dailyData.map((day, i) => {
                    const maxDailyRev = Math.max(...analytics.dailyData.map(d => d.revenue), 1);
                    const height = (day.revenue / maxDailyRev) * 120;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          ₹{day.revenue.toLocaleString()} • {day.orders} orders
                        </div>
                        <div className="w-full max-w-[32px] bg-gradient-to-t from-secondary to-purple-400 rounded-t-lg transition-all duration-500 hover:brightness-110 cursor-help"
                          style={{ height: `${height}px`, minHeight: '4px' }}
                        />
                        <span className="text-[10px] text-text-secondary font-medium mt-1 whitespace-nowrap">{day.date.split(',')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-secondary text-center py-12">No daily data available</p>
              )}
            </div>
          </div>

          {/* Monthly Revenue Table */}
          <div className="card mt-6">
            <h2 className="font-display font-bold text-lg text-text-primary mb-5">Monthly Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-gray-100">
                    <th className="pb-3 font-medium">Month</th>
                    <th className="pb-3 font-medium">Sessions</th>
                    <th className="pb-3 font-medium">Patients</th>
                    <th className="pb-3 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.monthlyData || []).map((month, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-semibold text-text-primary">{month.month}</td>
                      <td className="py-3 text-text-primary">{month.sessions}</td>
                      <td className="py-3 text-text-primary">{month.patients}</td>
                      <td className="py-3 text-text-primary">₹{month.revenue?.toLocaleString() || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminAnalytics;
