import { Link } from 'react-router-dom';
import { Brain, Mail, Phone, MapPin, Instagram, Twitter, Linkedin, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-white">
                Your<span className="text-primary-300">Therapist</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              Professional online therapy platform. Begin your journey to better mental health with licensed therapists from the comfort of your home.
            </p>
            <div className="flex items-center gap-3">
              {[Instagram, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { name: 'About Us', path: '/about' },
                { name: 'Our Services', path: '/services' },
                { name: 'Contact Us', path: '/contact' },
                { name: 'Book a Session', path: '/register' },
                { name: 'Privacy Policy', path: '/privacy' },
              ].map((item) => (
                <li key={item.name}>
                  <Link to={item.path} className="text-sm text-gray-400 hover:text-primary-300 transition-colors duration-200">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Services</h4>
            <ul className="space-y-3">
              {[
                'Individual Therapy',
                'Couples Therapy',
                'Anxiety & Depression',
                'Stress Management',
                'Video Consultations',
              ].map((item) => (
                <li key={item}>
                  <Link to="/services" className="text-sm text-gray-400 hover:text-primary-300 transition-colors duration-200">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-primary-300 flex-shrink-0" />
                hello@yourtherapist.com
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-primary-300 flex-shrink-0" />
                +91 98765 43210
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-primary-300 flex-shrink-0 mt-0.5" />
                Mumbai, Maharashtra, India
              </li>
            </ul>
            <div className="mt-5 p-4 rounded-2xl bg-gray-800/50 border border-gray-700">
              <p className="text-xs text-gray-400">
                🆘 <span className="text-primary-300 font-semibold">Crisis Helpline:</span> If you&apos;re in crisis, call: 7206086301
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © 2026 YourTherapist. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-gray-500 hover:text-primary-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-gray-500 hover:text-primary-300 transition-colors">Terms of Service</Link>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-danger fill-danger" /> for mental wellness
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
