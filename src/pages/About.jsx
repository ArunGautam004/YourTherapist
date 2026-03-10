import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Heart, Users, Shield, Award, Video, MessageCircle, Target, Sparkles,
  ArrowRight, Brain, CheckCircle2
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const About = () => {
  const values = [
    { icon: Heart, title: 'Compassion First', desc: 'We believe in treating every individual with empathy, respect, and genuine care.', color: 'from-rose-500 to-pink-400' },
    { icon: Shield, title: 'Privacy & Trust', desc: 'Your data is encrypted end-to-end. We maintain the highest standards of confidentiality.', color: 'from-primary to-emerald-400' },
    { icon: Users, title: 'Accessibility', desc: 'Affordable, accessible therapy for everyone — no matter where you are.', color: 'from-blue-500 to-cyan-400' },
    { icon: Award, title: 'Clinical Excellence', desc: 'All our therapists are licensed professionals with years of clinical experience.', color: 'from-amber-500 to-orange-400' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-primary-light px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">About Us</span>
            </motion.div>
            <motion.h1 variants={fadeInUp} className="font-display text-4xl sm:text-5xl font-bold text-text-primary leading-tight">
              Making <span className="gradient-text">Mental Health</span> Accessible to All
            </motion.h1>
            <motion.p variants={fadeInUp} className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              YourTherapist was founded with a simple mission: to bridge the gap between 
              individuals seeking mental health support and qualified professionals who can help.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <h2 className="font-display text-3xl font-bold text-text-primary mb-6">
                Our <span className="gradient-text">Story</span>
              </h2>
              <div className="space-y-4 text-text-secondary leading-relaxed">
                <p>
                  YourTherapist was created by <strong className="text-text-primary">Shubham Gautam</strong>, a passionate 
                  psychology student currently pursuing his B.A. in Psychology from the University of Delhi (DU).
                </p>
                <p>
                  Despite still being a student, Shubham recognized that many individuals, 
                  especially in smaller cities and rural areas, faced significant barriers to accessing 
                  therapy — be it social stigma, distance, or affordability. He decided to take action early.
                </p>
                <p>
                  YourTherapist was born from the belief that everyone deserves access to professional 
                  mental health support, regardless of their location or background. Having already treated 
                  50+ patients, Shubham combines empathy with modern technology to make therapy accessible.
                </p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="card p-8 bg-gradient-to-br from-primary-light/50 to-secondary-light/30">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-glow">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h3 className="font-display font-bold text-2xl text-text-primary mb-2">Shubham Gautam</h3>
                <p className="text-sm text-primary font-medium mb-4">Founder · B.A. Psychology, University of Delhi</p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Currently pursuing B.A. in Psychology from DU. Passionate about making therapy accessible 
                  and stigma-free. Specializes in anxiety, stress management, and emotional well-being counseling.
                </p>
                <div className="mt-6 pt-4 border-t border-gray-200/50 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">50+</p>
                    <p className="text-xs text-text-secondary">Patients</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">200+</p>
                    <p className="text-xs text-text-secondary">Sessions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">4.9</p>
                    <p className="text-xs text-text-secondary">Rating</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary-light/30 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="text-center mb-12">
            <motion.h2 variants={fadeInUp} className="section-heading">
              Our <span className="gradient-text">Values</span>
            </motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <motion.div key={v.title} variants={fadeInUp} className="card text-center group hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${v.color} flex items-center justify-center mx-auto mb-4 shadow-soft group-hover:shadow-soft-lg transition-all`}>
                  <v.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg text-text-primary mb-2">{v.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <h2 className="font-display text-3xl font-bold text-text-primary mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-text-secondary mb-8">Take the first step towards better mental health today.</p>
            <Link to="/register" className="btn-primary text-base px-8 py-4 inline-flex items-center gap-2">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
