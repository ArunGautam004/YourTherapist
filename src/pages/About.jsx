import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Brain,
  Heart,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const About = () => {
  const principles = [
    {
      icon: Heart,
      title: 'Human-Centered Care',
      desc: 'Empathy and respect are the baseline for every conversation and care plan.',
      color: 'from-rose-500 to-pink-400',
    },
    {
      icon: Shield,
      title: 'Confidential by Design',
      desc: 'Security and privacy are integrated into messaging, sessions, and records.',
      color: 'from-primary to-emerald-400',
    },
    {
      icon: Target,
      title: 'Evidence-Informed Approach',
      desc: 'Structured assessments and progress review support better decisions over time.',
      color: 'from-blue-500 to-cyan-400',
    },
    {
      icon: Users,
      title: 'Accessible Support',
      desc: 'High-quality therapy workflows that work across cities, towns, and remote regions.',
      color: 'from-amber-500 to-orange-400',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-28 pb-14 md:pt-34 md:pb-18 lg:pt-40 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 right-0 w-80 h-80 bg-primary/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-8 left-0 w-96 h-96 bg-secondary/10 blur-3xl rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-sm font-semibold text-primary">
              <Sparkles className="w-4 h-4" />
              About YourTherapist
            </p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold text-text-primary leading-tight">
              A Reliable Digital Clinic for
              <span className="gradient-text"> Mental Wellness</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-text-secondary leading-relaxed max-w-3xl mx-auto">
              YourTherapist was created to reduce barriers to care and make professional support consistently available through secure, modern technology.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-14 md:pb-18 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-7 card p-6 sm:p-8"
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">Our Story</h2>
              <div className="mt-4 space-y-4 text-text-secondary leading-relaxed">
                <p>
                  Founded by Shubham Gautam, YourTherapist began as a mission to make therapy practical, affordable, and stigma-free for people who cannot always access in-person support.
                </p>
                <p>
                  The platform combines a counseling-first mindset with efficient care delivery: secure sessions, guided assessments, care documentation, and progress visibility.
                </p>
                <p>
                  Our goal is simple: help more people receive timely and continuous mental healthcare with dignity and trust.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-5 card p-6 sm:p-8 bg-gradient-to-br from-primary-light/70 to-secondary-light/50"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold text-text-primary">Founder Profile</h3>
              <p className="mt-1 text-sm text-primary font-semibold">Shubham Gautam • Psychology Background</p>
              <p className="mt-4 text-sm text-text-secondary leading-relaxed">
                Focused on anxiety, emotional regulation, and patient-centered therapeutic communication using evidence-informed practices.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="font-display text-2xl font-bold text-primary">50+</p>
                  <p className="text-xs text-text-secondary">Patients</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="font-display text-2xl font-bold text-primary">200+</p>
                  <p className="text-xs text-text-secondary">Sessions</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-3">
                  <p className="font-display text-2xl font-bold text-primary">4.9</p>
                  <p className="text-xs text-text-secondary">Rating</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 lg:py-24 bg-gradient-to-b from-primary-light/35 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-heading">What Guides Us</h2>
            <p className="mt-3 text-text-secondary max-w-2xl mx-auto">
              A disciplined, ethical, and patient-first operating model.
            </p>
          </div>

          <div className="mt-9 grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {principles.map((item) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="card"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[2rem] bg-gray-900 p-8 md:p-12 text-center text-white"
          >
            <Award className="w-10 h-10 mx-auto text-primary-300" />
            <h2 className="mt-4 font-display text-3xl font-bold">Care that is Structured, Safe, and Human</h2>
            <p className="mt-3 text-gray-300 max-w-2xl mx-auto">
              Explore our services and choose the care format that works best for your lifestyle.
            </p>
            <Link to="/services" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold hover:bg-primary-dark transition-colors">
              View Services
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
