import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar as CalendarIcon, BarChart3, MessageCircle, Settings,
  ChevronLeft, ChevronRight, Video, MessageSquare, Clock, X, Save, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, authAPI } from '../../services/api';

const adminLinks = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Patients', path: '/admin/patients', icon: Users },
  { name: 'Calendar', path: '/admin/calendar', icon: CalendarIcon },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { name: 'Messages', path: '/admin/messages', icon: MessageCircle },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_OPTIONS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
];

const defaultSlots = DAYS.map(day => ({ day, startTime: '9:00 AM', endTime: '5:00 PM', enabled: false }));

const AdminCalendar = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(getWeekStart(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAvailability, setShowAvailability] = useState(false);
  const [slots, setSlots] = useState(defaultSlots);
  const [savingSlots, setSavingSlots] = useState(false);
  const [consultationFee, setConsultationFee] = useState(1500);
  const [chatFee, setChatFee] = useState(800);

  function getWeekStart(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Load current availability from user profile
  useEffect(() => {
    if (user?.availableSlots) {
      const merged = DAYS.map(day => {
        const existing = user.availableSlots.find(s => s.day === day);
        return existing
          ? { day, startTime: existing.startTime, endTime: existing.endTime, enabled: true }
          : { day, startTime: '9:00 AM', endTime: '5:00 PM', enabled: false };
      });
      setSlots(merged);
    }
    if (user?.consultationFee) setConsultationFee(user.consultationFee);
    if (user?.chatFee) setChatFee(user.chatFee);
  }, [user]);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const { data } = await appointmentAPI.getAll();
        setAppointments(data.appointments || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [currentWeek]);

  const getAppointmentForSlot = (date, time) => {
    return appointments.find(apt => {
      const aptDate = new Date(apt.date).toDateString();
      return aptDate === date.toDateString() && apt.time === time;
    });
  };

  // Generate time slots for display based on saved availability
  const getTimeSlotsForDay = (date) => {
    const dayName = date.toLocaleDateString('en', { weekday: 'long' });
    const daySlot = slots.find(s => s.day === dayName && s.enabled);
    if (!daySlot) return [];

    const result = [];
    const parseTime = (t) => {
      const [time, period] = t.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + (m || 0);
    };

    let current = parseTime(daySlot.startTime);
    const end = parseTime(daySlot.endTime);

    while (current + 50 <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      result.push(`${displayH}:${m.toString().padStart(2, '0')} ${period}`);
      current += 60;
    }
    return result;
  };

  // Get all unique time slots across the week for display
  const allTimeSlots = [...new Set(weekDays.flatMap(day => getTimeSlotsForDay(day)))].sort((a, b) => {
    const parse = (t) => {
      const [time, period] = t.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + (m || 0);
    };
    return parse(a) - parse(b);
  });

  const prevWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d);
  };

  const isToday = (date) => new Date().toDateString() === date.toDateString();

  const handleSaveAvailability = async () => {
    setSavingSlots(true);
    try {
      const availableSlots = slots
        .filter(s => s.enabled)
        .map(({ day, startTime, endTime }) => ({ day, startTime, endTime }));

      await authAPI.updateProfile({ availableSlots, consultationFee, chatFee });
      toast.success('Availability and fees updated! ✅');
      setShowAvailability(false);
    } catch (err) {
      toast.error('Failed to save availability');
    } finally {
      setSavingSlots(false);
    }
  };

  const toggleDay = (day) => {
    setSlots(prev => prev.map(s => s.day === day ? { ...s, enabled: !s.enabled } : s));
  };

  const updateSlot = (day, field, value) => {
    setSlots(prev => prev.map(s => s.day === day ? { ...s, [field]: value } : s));
  };

  const isDayAvailable = (date) => {
    const dayName = date.toLocaleDateString('en', { weekday: 'long' });
    return slots.some(s => s.day === dayName && s.enabled);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={adminLinks} userRole="admin" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
                Session <span className="gradient-text">Calendar</span>
              </h1>
              <p className="text-text-secondary mt-1">Manage your schedule and availability</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAvailability(true)}
                className="btn-primary flex items-center gap-2 !py-2.5"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Manage Availability</span>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={prevWeek} className="p-2 rounded-xl hover:bg-gray-100 text-text-secondary transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-semibold text-text-primary min-w-[180px] text-center">
                  {weekDays[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} — {weekDays[5].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button onClick={nextWeek} className="p-2 rounded-xl hover:bg-gray-100 text-text-secondary transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="card overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allTimeSlots.length > 0 ? (
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr>
                    <th className="py-3 px-2 w-24 text-xs text-text-secondary font-medium text-left">Time</th>
                    {weekDays.map((day) => (
                      <th key={day.toISOString()} className={`py-3 px-2 text-center ${isToday(day) ? 'text-primary font-bold' : 'text-text-secondary font-medium'}`}>
                        <div className="text-xs">{day.toLocaleDateString('en', { weekday: 'short' })}</div>
                        <div className={`text-lg ${isToday(day) ? 'bg-primary text-white w-8 h-8 rounded-xl flex items-center justify-center mx-auto' : ''}`}>
                          {day.getDate()}
                        </div>
                        {!isDayAvailable(day) && <span className="text-[10px] text-red-400 block">Off</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allTimeSlots.map((time) => (
                    <tr key={time} className="border-t border-gray-50">
                      <td className="py-3 px-2 text-xs text-text-secondary font-medium">{time}</td>
                      {weekDays.map((day) => {
                        const daySlots = getTimeSlotsForDay(day);
                        const isAvailable = daySlots.includes(time);
                        const apt = getAppointmentForSlot(day, time);
                        return (
                          <td key={day.toISOString()} className="py-1 px-1">
                            {apt ? (
                              <div className={`p-2 rounded-xl text-xs transition-all hover:shadow-soft cursor-pointer ${
                                apt.status === 'completed' ? 'bg-success/10 border border-success/20' :
                                apt.status === 'cancelled' ? 'bg-gray-100 border border-gray-200 opacity-50' :
                                'bg-primary-light border border-primary/10'
                              }`}>
                                <p className="font-semibold text-text-primary truncate">{apt.patient?.name || 'Patient'}</p>
                                <div className="flex items-center gap-1 mt-1 text-text-secondary">
                                  {apt.type === 'video' ? <Video className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                                  <span>{apt.duration || 50}min</span>
                                </div>
                              </div>
                            ) : isAvailable ? (
                              <div className="h-12 rounded-xl border border-dashed border-green-200 bg-green-50/30 hover:border-primary/30 transition-colors flex items-center justify-center">
                                <span className="text-[10px] text-green-400">Available</span>
                              </div>
                            ) : (
                              <div className="h-12 rounded-xl bg-gray-50" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16">
                <Clock className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
                <p className="text-text-secondary font-medium">No availability set</p>
                <p className="text-text-secondary/70 text-sm mt-1">Click "Manage Availability" to set your working hours</p>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Availability Modal */}
      <AnimatePresence>
        {showAvailability && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowAvailability(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="font-display font-bold text-xl text-text-primary">Manage Availability</h2>
                  <p className="text-sm text-text-secondary mt-1">Set your working hours and fees</p>
                </div>
                <button onClick={() => setShowAvailability(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Fees */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Video Fee (₹)</label>
                    <input
                      type="number"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      className="input-field !py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Chat Fee (₹)</label>
                    <input
                      type="number"
                      value={chatFee}
                      onChange={(e) => setChatFee(Number(e.target.value))}
                      className="input-field !py-2"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-text-primary mb-3">Working Days</p>
                </div>

                {slots.map((slot) => (
                  <div key={slot.day} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${slot.enabled ? 'bg-primary-light' : 'bg-gray-50'}`}>
                    <button
                      onClick={() => toggleDay(slot.day)}
                      className={`w-10 h-6 rounded-full transition-all flex-shrink-0 relative ${slot.enabled ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${slot.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                    <span className={`text-sm font-medium w-20 ${slot.enabled ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {slot.day.slice(0, 3)}
                    </span>
                    {slot.enabled && (
                      <div className="flex items-center gap-2 flex-1">
                        <select
                          value={slot.startTime}
                          onChange={(e) => updateSlot(slot.day, 'startTime', e.target.value)}
                          className="input-field !py-1.5 !text-xs flex-1"
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-xs text-text-secondary">to</span>
                        <select
                          value={slot.endTime}
                          onChange={(e) => updateSlot(slot.day, 'endTime', e.target.value)}
                          className="input-field !py-1.5 !text-xs flex-1"
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-100">
                <button
                  onClick={handleSaveAvailability}
                  disabled={savingSlots}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {savingSlots ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCalendar;
