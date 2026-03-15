import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
  TrendingUp, AlertTriangle, ClipboardList
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { patientAPI, messageAPI } from '../../services/api';

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
    { name: 'Questionnaires', path: '/admin/questionnaires', icon: ClipboardList },
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

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Daily Sessions Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-base text-text-primary">Daily Sessions</h2>
                <span className="text-xs text-text-secondary">Last 7 days</span>
              </div>
              {(analytics?.dailyData || []).length > 0 ? (
                <div className="flex items-end justify-between gap-2">
                  {analytics.dailyData.map((day, i) => {
                    const maxS = Math.max(...analytics.dailyData.map(d => d.orders), 1);
                    const barH = day.orders > 0 ? Math.max(Math.round((day.orders / maxS) * 80), 8) : 4;
                    const isToday = i === analytics.dailyData.length - 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        {/* Bar area — fixed 80px height, bar grows from bottom */}
                        <div className="relative w-full flex items-end justify-center" style={{ height: 80 }}>
                          {/* Tooltip above bar */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {day.orders}
                          </div>
                          <div
                            className={`w-full rounded-t-lg transition-all duration-500 cursor-help ${
                              isToday ? 'bg-gradient-to-t from-primary to-primary/60'
                              : day.orders > 0 ? 'bg-gradient-to-t from-primary/60 to-primary/30'
                              : 'bg-gray-100'
                            }`}
                            style={{ height: `${barH}px` }}
                          />
                        </div>
                        {/* Label always visible below */}
                        <span className={`text-[9px] font-medium text-center leading-none ${isToday ? 'text-primary font-bold' : 'text-text-secondary'}`}>
                          {day.date.split(',')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <p className="text-sm text-text-secondary">No data yet</p>
                </div>
              )}
            </div>

            {/* Daily Revenue Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-base text-text-primary">Daily Revenue</h2>
                <span className="text-xs text-text-secondary">Last 7 days</span>
              </div>
              {(analytics?.dailyData || []).length > 0 ? (
                <div className="flex items-end justify-between gap-2">
                  {analytics.dailyData.map((day, i) => {
                    const maxR = Math.max(...analytics.dailyData.map(d => d.revenue), 1);
                    const barH = day.revenue > 0 ? Math.max(Math.round((day.revenue / maxR) * 80), 8) : 4;
                    const isToday = i === analytics.dailyData.length - 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        {/* Bar area — fixed 80px height */}
                        <div className="relative w-full flex items-end justify-center" style={{ height: 80 }}>
                          {/* Tooltip above bar */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            ₹{day.revenue.toLocaleString()}
                          </div>
                          <div
                            className={`w-full rounded-t-lg transition-all duration-500 cursor-help ${
                              isToday ? 'bg-gradient-to-t from-secondary to-purple-400'
                              : day.revenue > 0 ? 'bg-gradient-to-t from-secondary/60 to-purple-300'
                              : 'bg-gray-100'
                            }`}
                            style={{ height: `${barH}px` }}
                          />
                        </div>
                        {/* Label always visible below */}
                        <span className={`text-[9px] font-medium text-center leading-none ${isToday ? 'text-secondary font-bold' : 'text-text-secondary'}`}>
                          {day.date.split(',')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <p className="text-sm text-text-secondary">No data yet</p>
                </div>
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