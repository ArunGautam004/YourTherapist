import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  HeartPulse,
  MessageCircle,
  Shield,
  Smile,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Services = () => {
  const services = [
    {
      icon: HeartPulse,
      title: 'Individual Therapy',
      summary: 'One-to-one sessions focused on anxiety, emotional stress, and life transitions.',
      bullets: ['Goal setting and case planning', 'CBT-informed interventions', 'Ongoing progress review'],
      color: 'from-rose-500 to-pink-400',
    },
    {
      icon: Users,
      title: 'Couples Counseling',
      summary: 'Structured sessions for communication repair, trust, and conflict resolution.',
      bullets: ['Relational assessment', 'Communication frameworks', 'Joint action plans'],
      color: 'from-primary to-emerald-400',
    },
    {
      icon: Brain,
      title: 'Anxiety and Depression Care',
      summary: 'Targeted support with evidence-informed methods and practical coping tools.',
      bullets: ['Symptom tracking', 'Thought pattern restructuring', 'Routine stabilization'],
      color: 'from-blue-500 to-cyan-400',
    },
    {
      icon: Smile,
      title: 'Stress Management',
      summary: 'Workload, burnout, and emotional resilience support for modern routines.',
      bullets: ['Nervous-system regulation', 'Daily stress protocols', 'Energy management'],
      color: 'from-amber-500 to-orange-400',
    },
    {
      icon: Video,
      title: 'Video Consultations',
      summary: 'Private HD telehealth sessions that work in-browser across all major devices.',
      bullets: ['Encrypted calls', 'Low-friction session join', 'Live collaboration tools'],
      color: 'from-indigo-500 to-violet-400',
    },
    {
      icon: MessageCircle,
      title: 'Secure Chat Support',
      summary: 'Maintain continuity of care between sessions through secure messaging.',
      bullets: ['Asynchronous follow-up', 'Quick therapist guidance', 'Confidential communication'],
      color: 'from-fuchsia-500 to-rose-400',
    },
  ];

  const tools = [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      desc: 'Faster booking with reminders and session access in one place.',
    },
    {
      icon: BarChart3,
      title: 'Progress Monitoring',
      desc: 'Understand treatment progress through clear mood and response trends.',
    },
    {
      icon: Shield,
      title: 'Clinical Privacy',
      desc: 'Security-first design for sensitive conversations and records.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-28 pb-14 md:pt-34 md:pb-18 lg:pt-40 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-8 left-0 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute -bottom-6 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-secondary-light px-4 py-2 text-sm font-semibold text-secondary"
          >
            <Sparkles className="w-4 h-4" />
            Services
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 font-display text-4xl sm:text-5xl font-bold text-text-primary leading-tight"
          >
            Therapy Services Built for
            <span className="gradient-text"> Continuity and Results</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 text-base sm:text-lg text-text-secondary leading-relaxed max-w-3xl mx-auto"
          >
            Choose a care model that fits your goals and schedule, then track your outcomes with integrated clinical tools.
          </motion.p>
        </div>
      </section>

      <section className="pb-14 md:pb-18 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
            {services.map((service) => (
              <motion.div
                key={service.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="card"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-text-primary">{service.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{service.summary}</p>
                <ul className="mt-4 space-y-2">
                  {service.bullets.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 lg:py-24 bg-gradient-to-b from-primary-light/35 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="section-heading">Platform Support Tools</h2>
            <p className="mt-3 text-text-secondary max-w-2xl mx-auto">
              Clinical sessions are strengthened by scheduling, follow-up, and progress visibility.
            </p>
          </div>

          <div className="mt-9 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((tool) => (
              <motion.div
                key={tool.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="card text-center"
              >
                <tool.icon className="w-10 h-10 text-primary mx-auto" />
                <h3 className="mt-4 font-display text-lg font-bold text-text-primary">{tool.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{tool.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-secondary p-8 sm:p-10 md:p-14 text-center text-white"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold">Start with a Session That Fits You</h2>
            <p className="mt-3 text-white/80 max-w-2xl mx-auto">
              Begin with secure onboarding and schedule your first consultation in minutes.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/register" className="bg-white text-primary px-7 py-3.5 rounded-2xl font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2">
                Book First Session
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/contact" className="border border-white/45 px-7 py-3.5 rounded-2xl font-semibold hover:bg-white/10 transition-colors">
                Talk to Team
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
