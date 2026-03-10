import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Video, Shield, Brain, Calendar, ClipboardList, BarChart3,
  Heart, MessageCircle, Star, ArrowRight, CheckCircle2, Sparkles, Users, Clock
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const LandingPage = () => {
  const features = [
    { icon: Video, title: 'Video Sessions', desc: 'Secure HD video calls with your therapist from the comfort of home.', color: 'from-blue-500 to-cyan-400' },
    { icon: ClipboardList, title: 'Live Assessments', desc: 'Interactive questionnaires during sessions for real-time evaluation.', color: 'from-primary to-emerald-400' },
    { icon: BarChart3, title: 'Progress Tracking', desc: 'Visualize your mental health journey with detailed charts and insights.', color: 'from-secondary to-pink-400' },
    { icon: Calendar, title: 'Easy Scheduling', desc: 'Book appointments with a few clicks. Reminders keep you on track.', color: 'from-amber-500 to-orange-400' },
    { icon: MessageCircle, title: 'Secure Messaging', desc: 'Chat with your therapist between sessions. Your data stays private.', color: 'from-pink-500 to-rose-400' },
    { icon: Shield, title: 'Private & Secure', desc: 'End-to-end encryption. HIPAA-compliant. Your privacy matters most.', color: 'from-gray-600 to-gray-400' },
  ];

  const stats = [
    { value: '10K+', label: 'Patients Helped', icon: Users },
    { value: '500+', label: 'Sessions Monthly', icon: Video },
    { value: '4.9', label: 'Average Rating', icon: Star },
    { value: '24/7', label: 'Support Available', icon: Clock },
  ];

  const testimonials = [
    { name: 'Priya M.', role: 'Patient for 6 months', text: 'YourTherapist transformed my approach to mental health. The video sessions feel just as personal as in-person visits, and the mood tracking has been incredibly insightful.', rating: 5, avatar: '🧑‍🦱' },
    { name: 'Rahul K.', role: 'Patient for 3 months', text: 'The live questionnaires during sessions helped my therapist understand me better. I can see my progress over time and that keeps me motivated.', rating: 5, avatar: '👨' },
    { name: 'Ananya S.', role: 'Patient for 1 year', text: 'Having everything in one place — appointments, mood journal, session notes — makes managing my mental health so much easier. Highly recommended!', rating: 5, avatar: '👩' },
  ];

  const steps = [
    { step: '01', title: 'Create Your Account', desc: 'Sign up in minutes. Share only what you feel comfortable with.' },
    { step: '02', title: 'Book a Session', desc: 'Choose a time that works for you from the available slots.' },
    { step: '03', title: 'Meet Your Therapist', desc: 'Join a secure video call with your licensed therapist.' },
    { step: '04', title: 'Track Your Growth', desc: 'Monitor your progress with mood journals and session insights.' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-32 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-primary/3 to-secondary/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-primary-light px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Professional Online Therapy</span>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight">
                Your Journey to{' '}
                <span className="gradient-text">Mental Wellness</span>{' '}
                Starts Here
              </motion.h1>

              <motion.p variants={fadeInUp} className="mt-6 text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Connect with licensed therapists through secure video sessions.
                Track your progress, manage appointments, and take control of your
                mental health — all in one place.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link to="/register" className="btn-primary text-base px-8 py-4 flex items-center gap-2 w-full sm:w-auto justify-center">
                  Start Your Journey
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/login" className="btn-outline text-base px-8 py-4 w-full sm:w-auto text-center">
                  I Have an Account
                </Link>
              </motion.div>

              <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-6 justify-center lg:justify-start text-sm text-text-secondary">
                {['Free Initial Consultation', 'No commitment', '100% Confidential'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    {item}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Decorative Card Grid */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full h-[500px]">
                {/* Main Card */}
                <div className="absolute top-8 left-8 right-8 card p-8 z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-glow">
                      <Brain className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-text-primary">Shubham Gautam</h3>
                      <p className="text-sm text-text-secondary">Psychology Consultant · B.A. Psychology, DU</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary-light/50">
                      <span className="text-sm font-medium text-text-primary">Next Session</span>
                      <span className="text-sm font-semibold text-primary">Today, 4:00 PM</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-secondary-light/50">
                      <span className="text-sm font-medium text-text-primary">Mood Score</span>
                      <span className="text-sm font-semibold text-secondary">8.5/10 ↑</span>
                    </div>
                  </div>
                </div>

                {/* Floating Mini Cards */}
                <div className="absolute bottom-12 left-0 glass p-4 shadow-soft-lg animate-float z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">This Week</p>
                      <p className="text-sm font-bold text-text-primary">Mood Improved +12%</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 right-0 glass p-4 shadow-soft-lg animate-float z-20" style={{ animationDelay: '2s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Sessions</p>
                      <p className="text-sm font-bold text-text-primary">12 Completed</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary-dark relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-5 left-10 w-40 h-40 border border-white/20 rounded-full" />
          <div className="absolute bottom-5 right-10 w-60 h-60 border border-white/20 rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={fadeInUp} className="text-center">
                <stat.icon className="w-8 h-8 text-white/70 mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-display font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/70 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="services" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-secondary-light px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">Our Features</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="section-heading">
              Everything You Need for{' '}
              <span className="gradient-text">Better Mental Health</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-text-secondary text-lg max-w-2xl mx-auto">
              A comprehensive platform designed to make therapy accessible, engaging, and effective.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="card group cursor-pointer hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-soft group-hover:shadow-soft-lg transition-all duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display font-bold text-xl text-text-primary mb-2">{feature.title}</h3>
                <p className="text-text-secondary leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-primary-light/30 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-primary-light px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">How It Works</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="section-heading">
              Start in{' '}
              <span className="gradient-text">4 Simple Steps</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {steps.map((step, i) => (
              <motion.div key={step.step} variants={fadeInUp} className="relative">
                <div className="card text-center relative overflow-hidden group hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl" />
                  <span className="text-5xl font-display font-bold text-primary/10 group-hover:text-primary/20 transition-colors">{step.step}</span>
                  <h3 className="font-display font-bold text-lg text-text-primary mt-2 mb-2">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-secondary-light px-4 py-2 rounded-full mb-4">
              <Heart className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">Testimonials</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="section-heading">
              What Our <span className="gradient-text">Patients Say</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeInUp} className="card relative group hover:-translate-y-1">
                <div className="absolute top-6 right-6 text-4xl opacity-10 group-hover:opacity-20 transition-opacity">"</div>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-text-secondary leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center text-xl">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">{t.name}</p>
                    <p className="text-xs text-text-secondary">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-secondary p-12 md:p-16 text-center"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full" />
              <div className="absolute bottom-10 right-10 w-48 h-48 border-2 border-white rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white rounded-full" />
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Ready to Begin Your Healing Journey?
              </h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
                Take the first step towards better mental health. Our licensed therapists are here to support you every step of the way.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="bg-white text-primary font-semibold px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all duration-300 shadow-soft-lg hover:shadow-soft-xl active:scale-[0.98] flex items-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all duration-300"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
