import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Brain, LogIn, UserPlus, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const dashboardPath = user?.role === 'doctor' ? '/admin/dashboard' : '/patient/dashboard';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all duration-300">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-text-primary">
              Your<span className="text-primary">Therapist</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                  ${location.pathname === link.path
                    ? 'text-primary bg-primary-light'
                    : 'text-text-secondary hover:text-primary hover:bg-primary-light/50'
                  }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-primary hover:bg-primary-light transition-all duration-200"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-text-secondary hover:text-danger hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-primary hover:bg-primary-light transition-all duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm !px-5 !py-2.5 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl text-text-secondary hover:bg-primary-light transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-light transition-all"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                {user ? (
                  <>
                    <Link to={dashboardPath} className="btn-primary text-sm text-center" onClick={() => setIsOpen(false)}>
                      Dashboard
                    </Link>
                    <button onClick={() => { handleLogout(); setIsOpen(false); }} className="btn-outline text-sm text-center">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn-outline text-sm text-center" onClick={() => setIsOpen(false)}>
                      Sign In
                    </Link>
                    <Link to="/register" className="btn-primary text-sm text-center" onClick={() => setIsOpen(false)}>
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
