import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from './NotificationBell';
import {
  Brain, LayoutDashboard, Calendar, Users, BarChart3,
  MessageCircle, Settings, LogOut, Menu, X, Bell, Search, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ links, userRole = 'patient' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();

  const displayUser = authUser
    ? { 
        name: authUser.name || (authUser.role === 'doctor' ? 'Doctor' : 'Patient'), 
        role: authUser.role === 'doctor' ? authUser.specialization || 'Clinical Psychologist' : 'Patient', 
        avatar: authUser.role === 'doctor' ? '👩‍⚕️' : '👤', 
        profilePic: authUser.profilePic 
      }
    : userRole === 'admin'
      ? { name: 'Doctor', role: 'Clinical Psychologist', avatar: '👩‍⚕️', profilePic: null }
      : { name: 'Patient', role: 'Patient', avatar: '👤', profilePic: null };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-lg text-text-primary">
              Your<span className="text-primary">Therapist</span>
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block p-1.5 rounded-xl hover:bg-gray-100 text-text-secondary"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
              title={collapsed ? link.name : ''}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{link.name}</span>}
              {!collapsed && link.badge && (
                <span className="ml-auto bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="p-3 mt-auto">
        <div className={`flex items-center gap-3 p-3 rounded-2xl bg-gray-50 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
            {displayUser.profilePic ? (
              <img src={displayUser.profilePic} alt={displayUser.name} className="w-full h-full object-cover" />
            ) : (
              displayUser.avatar
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{displayUser.name}</p>
              <p className="text-xs text-text-secondary">{displayUser.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-gray-200 text-text-secondary transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/10 px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-text-primary">
            Your<span className="text-primary">Therapist</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center -mr-1">
            <NotificationBell />
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 text-text-secondary"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-white z-50 shadow-soft-xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block fixed left-0 top-0 bottom-0 bg-white border-r border-gray-100 transition-all duration-300 z-30 ${collapsed ? 'w-[80px]' : 'w-[260px]'}`}>
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;
