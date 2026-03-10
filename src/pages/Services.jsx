import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Video, MessageCircle, Brain, Shield, BarChart3, Users, HeartPulse, Smile,
  ArrowRight, Sparkles, CheckCircle2, Calendar
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const Services = () => {
  const services = [
    {
      icon: HeartPulse,
      title: 'Individual Therapy',
      desc: 'One-on-one confidential sessions with a licensed psychologist to address anxiety, depression, stress, PTSD, grief, and more.',
      features: ['Cognitive Behavioral Therapy (CBT)', 'Mindfulness-Based Therapy', 'Trauma Processing', 'Personalized treatment plans'],
      color: 'from-rose-500 to-pink-400',
    },
    {
      icon: Users,
      title: 'Couples Therapy',
      desc: 'Strengthen your relationship through guided therapy. Address communication issues, conflict resolution, and emotional intimacy.',
      features: ['Relationship assessment', 'Communication coaching', 'Conflict resolution', 'Trust rebuilding'],
      color: 'from-primary to-emerald-400',
    },
    {
      icon: Brain,
      title: 'Anxiety & Depression',
      desc: 'Specialized treatment for anxiety disorders and depression. Evidence-based approaches tailored to your unique experience.',
      features: ['Panic disorder treatment', 'Social anxiety support', 'Major depression therapy', 'Mood regulation strategies'],
      color: 'from-blue-500 to-cyan-400',
    },
    {
      icon: Smile,
      title: 'Stress Management',
      desc: 'Learn practical techniques to manage daily stress, improve work-life balance, and build emotional resilience.',
      features: ['Relaxation techniques', 'Work-life balance strategies', 'Burnout prevention', 'Resilience building'],
      color: 'from-amber-500 to-orange-400',
    },
    {
      icon: Video,
      title: 'Video Consultations',
      desc: 'Secure, high-quality video sessions from the comfort of your home. All sessions are encrypted end-to-end.',
      features: ['HD video & audio', 'End-to-end encryption', 'Screen sharing support', 'Session recording (with consent)'],
      color: 'from-indigo-500 to-purple-400',
    },
    {
      icon: MessageCircle,
      title: 'Chat Sessions',
      desc: 'Text-based therapy for those who prefer written communication. All conversations are fully private and secure.',
      features: ['Real-time messaging', 'Async communication', 'Private & encrypted', 'Share media & documents'],
      color: 'from-pink-500 to-rose-400',
    },
  ];

  const tools = [
    { icon: Calendar, title: 'Easy Scheduling', desc: 'Book sessions in a few clicks. Automated reminders keep you on track.' },
    { icon: BarChart3, title: 'Progress Tracking', desc: 'Visualize your mental health journey with detailed charts and mood logs.' },
    { icon: Shield, title: 'Mood Journal', desc: 'Daily self-reflection tool to track your emotional patterns and triggers.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-secondary-light px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">Our Services</span>
            </motion.div>
            <motion.h1 variants={fadeInUp} className="font-display text-4xl sm:text-5xl font-bold text-text-primary leading-tight">
              Comprehensive <span className="gradient-text">Mental Health</span> Services
            </motion.h1>
            <motion.p variants={fadeInUp} className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto">
              Evidence-based therapy services designed to support your mental health journey, 
              delivered by licensed professionals through our secure platform.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <motion.div key={s.title} variants={fadeInUp} className="card group hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5 shadow-soft group-hover:shadow-soft-lg transition-all`}>
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display font-bold text-xl text-text-primary mb-2">{s.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-4">{s.desc}</p>
                <ul className="space-y-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Self-Help Tools */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary-light/30 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="text-center mb-12">
            <motion.h2 variants={fadeInUp} className="section-heading">
              Self-Help <span className="gradient-text">Tools</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-text-secondary max-w-xl mx-auto">
              Complement your therapy sessions with our built-in tools.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid md:grid-cols-3 gap-6">
            {tools.map((t) => (
              <motion.div key={t.title} variants={fadeInUp} className="card text-center group hover:-translate-y-1">
                <t.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg text-text-primary mb-2">{t.title}</h3>
                <p className="text-sm text-text-secondary">{t.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
            className="rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-secondary p-12 md:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full" />
              <div className="absolute bottom-10 right-10 w-48 h-48 border-2 border-white rounded-full" />
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Book Your First Session?
              </h2>
              <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
                Start with a brief assessment and we'll match you with the right approach.
              </p>
              <Link to="/register" className="bg-white text-primary font-semibold px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all shadow-soft-lg inline-flex items-center gap-2">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;
