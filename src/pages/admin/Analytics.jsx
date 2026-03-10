import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
  TrendingUp, AlertTriangle
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { patientAPI } from '../../services/api';

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

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await patientAPI.getAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar links={adminLinks} userRole="admin" />
        <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  const metrics = [
    { label: 'Total Patients', value: analytics?.totalPatients || '—', icon: Users, color: 'from-primary to-emerald-400' },
    { label: 'Total Sessions', value: analytics?.totalSessions || '—', icon: BarChart3, color: 'from-secondary to-purple-400' },
    { label: 'Revenue', value: analytics?.totalRevenue ? `₹${analytics.totalRevenue.toLocaleString()}` : '—', icon: TrendingUp, color: 'from-amber-500 to-orange-400' },
    { label: 'Avg per Month', value: analytics?.monthlyData?.length ? Math.round(analytics.monthlyData.reduce((s, m) => s + m.sessions, 0) / analytics.monthlyData.length) : '—', icon: Calendar, color: 'from-pink-500 to-rose-400' },
  ];

  const maxSessions = analytics?.monthlyData ? Math.max(...analytics.monthlyData.map(m => m.sessions), 1) : 1;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={adminLinks} userRole="admin" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Practice <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-text-secondary mb-8">Insights into your practice performance</p>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metrics.map((metric) => (
              <div key={metric.label} className="card group hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-soft mb-3`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-display font-bold text-text-primary">{metric.value}</p>
                <p className="text-xs text-text-secondary">{metric.label}</p>
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

            {/* Conditions Breakdown */}
            <div className="lg:col-span-2 card">
              <h2 className="font-display font-bold text-lg text-text-primary mb-5">Top Conditions</h2>
              {(analytics?.conditions || []).length > 0 ? (
                <div className="space-y-4">
                  {analytics.conditions.slice(0, 5).map((cond, i) => {
                    const maxCount = analytics.conditions[0]?.count || 1;
                    const pct = Math.round((cond.count / maxCount) * 100);
                    const colors = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-warning', 'bg-danger'];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-text-primary font-medium">{cond.name}</span>
                          <span className="text-text-secondary text-xs">{cond.count} patients</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-secondary text-center py-6">No condition data yet</p>
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
