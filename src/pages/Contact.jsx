import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Sparkles, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
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

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSending(true);
    // Simulate send
    await new Promise(r => setTimeout(r, 1500));
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
    setForm({ name: '', email: '', subject: '', message: '' });
    setSending(false);
  };

  const contactInfo = [
    { icon: Mail, label: 'Email Us', value: 'hello@yourtherapist.com', desc: 'We reply within 24 hours' },
    { icon: Phone, label: 'Call Us', value: '+91 98765 43210', desc: 'Mon-Sat, 9 AM - 6 PM IST' },
    { icon: MapPin, label: 'Visit Us', value: 'Mumbai, Maharashtra', desc: 'India' },
    { icon: Clock, label: 'Working Hours', value: 'Mon - Sat', desc: '9:00 AM - 6:00 PM IST' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-primary-light px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Contact Us</span>
            </motion.div>
            <motion.h1 variants={fadeInUp} className="font-display text-4xl sm:text-5xl font-bold text-text-primary leading-tight">
              Get in <span className="gradient-text">Touch</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="mt-6 text-lg text-text-secondary max-w-xl mx-auto">
              Have a question or need help? We're here for you. Reach out and we'll respond as soon as possible.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="py-8 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Contact Form */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="card">
                <h2 className="font-display font-bold text-2xl text-text-primary mb-6">Send Us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Name *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Your name"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Email *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="your@email.com"
                        className="input-field"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Subject</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="How can we help?"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Message *</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us more..."
                      rows={5}
                      className="input-field resize-none"
                      required
                    />
                  </div>
                  <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="space-y-4">
              {contactInfo.map((info) => (
                <div key={info.label} className="card flex items-start gap-4 group hover:-translate-y-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                    <info.icon className="w-6 h-6 text-primary group-hover:text-white transition-all" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{info.label}</h3>
                    <p className="text-primary font-medium text-sm">{info.value}</p>
                    <p className="text-xs text-text-secondary mt-1">{info.desc}</p>
                  </div>
                </div>
              ))}

              {/* Crisis Box */}
              <div className="card bg-gradient-to-br from-danger/5 to-danger/10 border border-danger/20">
                <h3 className="font-display font-bold text-lg text-danger mb-2">🆘 In Crisis?</h3>
                <p className="text-sm text-text-secondary mb-3">
                  If you or someone you know is in immediate danger or experiencing a mental health crisis, please reach out:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-text-primary font-medium">
                    <Phone className="w-4 h-4 text-danger" /> Call: 7206086301
                  </li>
                  <li className="flex items-center gap-2 text-text-primary font-medium">
                    <Phone className="w-4 h-4 text-danger" /> Vandrevala Foundation: 1860-2662-345
                  </li>
                  <li className="flex items-center gap-2 text-text-primary font-medium">
                    <Phone className="w-4 h-4 text-danger" /> AASRA: 9820466626
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
