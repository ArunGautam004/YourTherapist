import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const LandingPage = () => {
  const pillars = [
    {
      icon: Video,
      title: 'Secure Video Therapy',
      description: 'Private, high-quality sessions with end-to-end encrypted communication.',
      accent: 'from-blue-500 to-cyan-400',
    },
    {
      icon: ClipboardList,
      title: 'Clinical Assessments',
      description: 'Live structured questionnaires during sessions to support better decisions.',
      accent: 'from-primary to-emerald-400',
    },
    {
      icon: BarChart3,
      title: 'Outcome Tracking',
      description: 'Track mood trends and treatment progress with clear longitudinal insights.',
      accent: 'from-secondary to-indigo-400',
    },
    {
      icon: Calendar,
      title: 'Reliable Scheduling',
      description: 'Simple booking with reminders and session links in one secure workspace.',
      accent: 'from-amber-500 to-orange-400',
    },
    {
      icon: MessageCircle,
      title: 'Secure Messaging',
      description: 'Stay connected between sessions without compromising privacy.',
      accent: 'from-rose-500 to-pink-400',
    },
    {
      icon: Shield,
      title: 'Data Protection',
      description: 'Role-based access, encrypted channels, and strict confidentiality standards.',
      accent: 'from-slate-600 to-slate-400',
    },
  ];

  const trustMetrics = [
    { value: '10K+', label: 'Patients Supported', icon: Users },
    { value: '500+', label: 'Sessions Every Month', icon: Video },
    { value: '24/7', label: 'Platform Availability', icon: Clock },
  ];

  const process = [
    {
      step: '01',
      title: 'Create Profile',
      detail: 'Complete onboarding so care can be tailored to your needs.',
    },
    {
      step: '02',
      title: 'Book Session',
      detail: 'Choose a time slot that works for your schedule.',
    },
    {
      step: '03',
      title: 'Join Securely',
      detail: 'Attend your session through an encrypted browser call.',
    },
    {
      step: '04',
      title: 'Track Progress',
      detail: 'Review mood trends, notes, and follow-up plans over time.',
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      <section className="relative pt-28 pb-16 md:pt-34 md:pb-20 lg:pt-40 lg:pb-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-8 right-0 w-80 h-80 bg-primary/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 -left-12 w-96 h-96 bg-secondary/10 blur-3xl rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="lg:col-span-7"
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold text-primary">Modern Mental Healthcare Platform</span>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="mt-5 font-display text-4xl sm:text-5xl xl:text-6xl font-bold leading-tight text-text-primary">
                Professional Therapy
                <span className="gradient-text"> Designed for Real Life</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="mt-5 text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed">
                YourTherapist combines clinical care, secure telehealth, and measurable progress tools in one platform so patients and therapists can work better together.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link to="/register" className="btn-primary px-7 py-3.5 text-sm sm:text-base inline-flex items-center justify-center gap-2">
                  Start as Patient
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="btn-outline px-7 py-3.5 text-sm sm:text-base text-center">
                  Sign In
                </Link>
              </motion.div>

              <motion.div variants={fadeInUp} className="mt-6 grid sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-text-secondary">
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> HIPAA-style privacy controls</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Fast session onboarding</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success" /> Built-in progress review</span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="lg:col-span-5"
            >
              <div className="card p-6 sm:p-7 lg:p-8">
                <p className="text-xs uppercase tracking-wider text-text-secondary">Clinical Snapshot</p>
                <h3 className="mt-2 font-display text-xl font-bold text-text-primary">Care Team Dashboard</h3>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-primary-light/70 p-4 flex items-center justify-between">
                    <p className="text-sm text-text-primary font-medium">Upcoming Session</p>
                    <p className="text-sm text-primary font-semibold">Today, 4:00 PM</p>
                  </div>
                  <div className="rounded-2xl bg-secondary-light/70 p-4 flex items-center justify-between">
                    <p className="text-sm text-text-primary font-medium">Mood Trend</p>
                    <p className="text-sm text-secondary font-semibold">+12% this week</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4 flex items-center justify-between">
                    <p className="text-sm text-text-primary font-medium">Plan Adherence</p>
                    <p className="text-sm text-emerald-600 font-semibold">On track</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-gradient-to-r from-primary to-primary-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {trustMetrics.map((item) => (
              <div key={item.label} className="text-center text-white">
                <item.icon className="w-7 h-7 mx-auto text-white/75" />
                <p className="mt-2 font-display text-3xl font-bold">{item.value}</p>
                <p className="text-sm text-white/75">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.p variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-secondary-light px-4 py-2 text-sm font-medium text-secondary">
              <Sparkles className="w-4 h-4" />
              Platform Capabilities
            </motion.p>
            <motion.h2 variants={fadeInUp} className="section-heading mt-4">
              Built for Patients and Therapists
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-text-secondary max-w-2xl mx-auto">
              Every workflow is designed for clarity, continuity, and measurable care quality.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-10 grid md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6"
          >
            {pillars.map((pillar) => (
              <motion.div key={pillar.title} variants={fadeInUp} className="card group hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pillar.accent} flex items-center justify-center mb-4 shadow-soft`}>
                  <pillar.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-text-primary">{pillar.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{pillar.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-gradient-to-b from-primary-light/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-heading">How Care Starts</h2>
            <p className="mt-3 text-text-secondary max-w-2xl mx-auto">A clear onboarding experience that works across mobile, tablet, and desktop.</p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {process.map((item) => (
              <div key={item.step} className="card p-5 sm:p-6">
                <p className="text-4xl font-display font-bold text-primary/20">{item.step}</p>
                <h3 className="mt-2 text-lg font-display font-bold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-secondary p-8 sm:p-10 md:p-14 text-white text-center"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold">Ready to begin better care?</h2>
            <p className="mt-3 text-white/80 max-w-2xl mx-auto">
              Get started in minutes and connect with professional mental healthcare through one secure, modern platform.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/register" className="bg-white text-primary font-semibold px-7 py-3.5 rounded-2xl hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2">
                Create Account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/services" className="border border-white/45 rounded-2xl px-7 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors">
                Explore Services
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
