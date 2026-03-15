import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
  Video, Clock, Check, Loader2, CreditCard, Star, User as UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, doctorAPI, messageAPI } from '../../services/api';

const BookAppointment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [totalUnread, setTotalUnread] = useState(0);

  // Consistent sidebar — live unread badge
  const patientLinks = [
    { name: 'Dashboard',        path: '/patient/dashboard', icon: LayoutDashboard },
    { name: 'My Sessions',      path: '/patient/sessions',  icon: Clock },
    { name: 'Book Appointment', path: '/patient/book',      icon: Calendar },
    { name: 'Mood Journal',     path: '/patient/journal',   icon: BookOpen },
    { name: 'Messages',         path: '/patient/messages',  icon: MessageCircle, badge: totalUnread > 0 ? String(totalUnread) : null },
    { name: 'Settings',         path: '/patient/settings',  icon: Settings },
  ];

  useEffect(() => {
    messageAPI.getConversations()
      .then(({ data }) => {
        const u = (data.conversations || []).reduce((s, c) => s + (c.unreadCount || 0), 0);
        setTotalUnread(u);
      }).catch(() => {});
  }, []);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [dayAvailability, setDayAvailability] = useState({}); // date string -> bool
  const [bookedAppointment, setBookedAppointment] = useState(null);

  // Generate next 14 days starting from today
  // Don't exclude any day — doctor availability handles which days are bookable
  const now = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  // Helper: check if a time slot has already passed for today
  const isSlotPassed = (slotTime) => {
    if (!slotTime) return false;
    if (!selectedDate || selectedDate.toDateString() !== now.toDateString()) return false;
    const timeStr = typeof slotTime === 'string' ? slotTime : slotTime.time;
    if (!timeStr) return false;
    const [time, period] = timeStr.split(' ');
    let [h, m] = (time || '0:0').split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + (m || 0) <= now.getHours() * 60 + now.getMinutes();
  };

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await doctorAPI.getAll();
        setDoctors(data.doctors || []);
        if (data.doctors?.length > 0) {
          setSelectedDoctor(data.doctors[0]);
          setDoctorInfo(data.doctors[0]);
        }
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
        toast.error('Failed to load doctors');
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch available slots when date + doctor change
  useEffect(() => {
    if (!selectedDate || !selectedDoctor) return;
    const fetchSlots = async () => {
      setLoading(true);
      setSelectedTime(null);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const { data } = await appointmentAPI.getSlots(selectedDoctor._id, dateStr);
        const slots = data.slots || [];
        setAvailableSlots(slots);
        if (data.doctor) setDoctorInfo(data.doctor);
        // Track availability per date for UI indicators
        setDayAvailability(prev => ({ ...prev, [dateStr]: slots.length > 0 }));
      } catch (err) {
        console.error(err);
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedDoctor]);

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !selectedDoctor) return;
    setBooking(true);

    try {
      // Step 1: Create appointment + Razorpay order
      const { data } = await appointmentAPI.create({
        doctorId: selectedDoctor._id,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        type: 'video',
      });

      // Step 2: Load Razorpay
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Razorpay failed to load. Check your internet connection.');
        setBooking(false);
        return;
      }

      // Step 3: Open Razorpay modal
      const options = {
        key: data.razorpayKeyId,
        amount: data.razorpayOrder.amount,
        currency: data.razorpayOrder.currency,
        name: 'YourTherapist',
        description: `Video Session with Dr. ${doctorInfo?.name || 'Therapist'}`,
        order_id: data.razorpayOrder.id,
        handler: async (response) => {
          // Step 4: Verify payment
          try {
            const verifyRes = await appointmentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              appointmentId: data.appointment._id,
            });
            setBookedAppointment(verifyRes.data.appointment);
            setBookingSuccess(true);
            setStep(4); // Success step
            toast.success('Payment successful! Appointment confirmed! 🎉');
          } catch (err) {
            toast.error('Payment verification failed. Contact support.');
          }
          setBooking(false);
        },
        modal: {
          ondismiss: () => {
            setBooking(false);
            toast.error('Payment was cancelled.');
          },
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#0d6b5e' },
      };

      const paymentModal = new window.Razorpay(options);
      paymentModal.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
      setBooking(false);
    }
  };

  const fee = doctorInfo?.consultationFee || 1500;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={patientLinks} userRole="patient" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Book an <span className="gradient-text">Appointment</span>
          </h1>
          <p className="text-text-secondary mb-8">Schedule a session with your therapist</p>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {['Doctor', 'Date & Time', bookingSuccess ? 'Confirmed' : 'Payment'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${step > i + 1 ? 'bg-success text-white' :
                  step === i + 1 ? 'bg-primary text-white shadow-glow' :
                    'bg-gray-100 text-text-secondary'
                  }`}>
                  {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${step === i + 1 ? 'text-primary' : 'text-text-secondary'}`}>
                  {label}
                </span>
                {i < 2 && <div className={`w-6 h-0.5 ${step > i + 1 ? 'bg-success' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Select Doctor */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
              <h2 className="font-display font-bold text-lg text-text-primary mb-5">Select Your Therapist</h2>
              {loadingDoctors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : doctors.length > 0 ? (
                <div className="space-y-3">
                  {doctors.map((doc) => (
                    <button
                      key={doc._id}
                      onClick={() => { setSelectedDoctor(doc); setDoctorInfo(doc); }}
                      className={`w-full p-5 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${selectedDoctor?._id === doc._id ? 'border-primary bg-primary-light shadow-glow' : 'border-gray-100 hover:border-primary/30'
                        }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {doc.profilePic
                          ? <img src={doc.profilePic} alt={doc.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                              <UserIcon className="w-7 h-7 text-white" />
                            </div>}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-text-primary text-lg">{doc.name}</p>
                        <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">{doc.bio}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-sm text-amber-500">
                            <Star className="w-4 h-4 fill-amber-400" /> {doc.rating}
                          </span>
                          <span className="text-sm text-text-secondary">{doc.experience} yrs exp</span>
                          <span className="text-sm font-bold text-primary">₹{doc.consultationFee}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-text-secondary">No doctors available right now</p>
              )}
              <button
                onClick={() => setStep(2)}
                disabled={!selectedDoctor}
                className="btn-primary w-full mt-6 disabled:opacity-50"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
              <h2 className="font-display font-bold text-lg text-text-primary mb-5">Select Date</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                {dates.map((date) => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  const isTodayDate = date.toDateString() === now.toDateString();
                  const dateKey = date.toISOString().split('T')[0];
                  const hasSlots = dayAvailability[dateKey] === true;
                  const notAvail = dayAvailability.hasOwnProperty(dateKey) && !dayAvailability[dateKey];
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                      className={`flex-shrink-0 flex flex-col items-center p-3 rounded-2xl min-w-[72px] transition-all border-2 ${
                        isSelected
                          ? 'bg-primary text-white shadow-glow border-primary'
                          : notAvail
                            ? 'bg-gray-50 text-gray-400 border-gray-100'
                            : 'bg-white text-text-secondary hover:bg-primary-light hover:border-primary/20 border-gray-100'
                      }`}
                    >
                      <span className={`text-[10px] font-semibold ${isSelected ? 'text-white/80' : 'text-text-secondary'}`}>
                        {date.toLocaleDateString('en', { weekday: 'short' })}
                      </span>
                      <span className={`text-lg font-bold ${isTodayDate && !isSelected ? 'text-primary' : ''}`}>
                        {date.getDate()}
                      </span>
                      <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-text-secondary'}`}>
                        {date.toLocaleDateString('en', { month: 'short' })}
                      </span>
                      {isTodayDate && !isSelected && (
                        <span className="text-[8px] text-primary font-bold mt-0.5">Today</span>
                      )}
                      {notAvail && !isSelected && (
                        <span className="text-[8px] text-gray-400 mt-0.5">Unavailable</span>
                      )}
                      {hasSlots && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-success mt-0.5 inline-block" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <>
                  <h2 className="font-display font-bold text-lg text-text-primary mb-4">Select Time</h2>
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {availableSlots
                        .filter((slot) => !isSlotPassed(typeof slot === 'string' ? slot : slot.time))
                        .map((slot) => {
                          // Backend returns plain strings e.g. "10:00 AM"
                          const timeStr = typeof slot === 'string' ? slot : slot.time;
                          return (
                            <button
                              key={timeStr}
                              onClick={() => setSelectedTime(timeStr)}
                              className={`p-3 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-1
                                ${selectedTime === timeStr
                                  ? 'bg-primary text-white shadow-glow'
                                  : 'bg-gray-50 text-text-primary hover:bg-primary-light hover:text-primary'
                                }`}
                            >
                              <Clock className="w-4 h-4" /> {timeStr}
                            </button>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-text-primary">Not Available</p>
                      <p className="text-xs text-text-secondary mt-1">
                        No slots on {selectedDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}.
                        Try another date.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="btn-outline flex-1">Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedDate || !selectedTime}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  Continue to Payment
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm & Pay */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
              <h2 className="font-display font-bold text-lg text-text-primary mb-5">Confirm & Pay</h2>

              {/* Session Type Badge */}
              <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-primary bg-primary-light mb-6">
                <Video className={`w-8 h-8 text-primary`} />
                <div>
                  <p className="font-semibold text-text-primary">Video Call Session</p>
                  <p className="text-xs text-text-secondary">Face-to-face session via HD video</p>
                </div>
                <p className="text-lg font-bold text-primary ml-auto">₹{fee}</p>
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-6">
                <h3 className="font-semibold text-text-primary text-sm mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Doctor</span>
                    <span className="font-semibold text-text-primary">{doctorInfo?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date</span>
                    <span className="font-semibold text-text-primary">
                      {selectedDate?.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Time</span>
                    <span className="font-semibold text-text-primary">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Type</span>
                    <span className="font-semibold text-text-primary">Video Call</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-text-primary">Total</span>
                    <span className="font-bold text-primary text-lg">₹{fee}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-outline flex-1">Back</button>
                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {booking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Pay ₹{fee}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4 (mapped to 4): Success */}
          {step === 4 && bookingSuccess && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-center">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
                <Check className="w-10 h-10 text-success" />
              </div>
              <h2 className="font-display font-bold text-2xl text-text-primary mb-2">Appointment Confirmed!</h2>
              <p className="text-text-secondary mb-6">A confirmation email has been sent to your registered email address.</p>
              <div className="bg-gray-50 rounded-2xl p-5 my-4 text-left max-w-xs mx-auto">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Doctor</span>
                    <span className="font-semibold text-text-primary">{doctorInfo?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date</span>
                    <span className="font-semibold text-text-primary">
                      {selectedDate?.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Time</span>
                    <span className="font-semibold text-text-primary">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Payment</span>
                    <span className="font-semibold text-success">₹{fee} Paid ✓</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 max-w-xs mx-auto mt-6">
                <button onClick={() => navigate('/patient/messages')} className="btn-outline flex-1">Messages</button>
                <button onClick={() => navigate('/patient/dashboard')} className="btn-primary flex-1">Dashboard</button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default BookAppointment;