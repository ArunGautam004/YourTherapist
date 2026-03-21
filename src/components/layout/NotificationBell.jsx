import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Calendar, MessageCircle, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const TYPE_ICON = {
  appointment_confirmed: <Calendar className="w-4 h-4 text-emerald-500" />,
  appointment_reminder:  <Clock className="w-4 h-4 text-amber-500" />,
  new_message:           <MessageCircle className="w-4 h-4 text-blue-500" />,
  general:               <Bell className="w-4 h-4 text-gray-400" />,
};

const TYPE_BG = {
  appointment_confirmed: 'bg-emerald-50',
  appointment_reminder:  'bg-amber-50',
  new_message:           'bg-blue-50',
  general:               'bg-gray-50',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for real-time notifications via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification:new', handleNew);
    return () => socket.off('notification:new', handleNew);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationAPI.getAll();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      console.error('Failed to fetch notifications:', e.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('markAllRead failed:', e.message);
    }
  };

  const handleClick = async (notif) => {
    // Mark as read
    if (!notif.read) {
      try {
        await notificationAPI.markOneRead(notif._id);
        setNotifications(prev =>
          prev.map(n => n._id === notif._id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) { /* silent */ }
    }

    setOpen(false);

    // Navigate to link if present
    if (notif.link) navigate(notif.link);
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const sanitizeNotificationText = (text = '') => {
    return String(text).replace(/\bDr\.\s+Dr\.\s+/gi, 'Dr. ');
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed md:absolute top-[70px] md:top-full inset-x-4 md:left-auto md:right-0 md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] md:z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                    title="Mark all read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-text-secondary text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif._id}
                    onClick={() => handleClick(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-50 last:border-0 ${!notif.read ? 'bg-blue-50/40' : ''}`}
                  >
                    {/* Icon badge */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${TYPE_BG[notif.type] || 'bg-gray-50'}`}>
                      {TYPE_ICON[notif.type] || TYPE_ICON.general}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!notif.read ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>
                        {sanitizeNotificationText(notif.title)}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-snug line-clamp-2">
                        {sanitizeNotificationText(notif.message)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>

                    {/* Unread dot */}
                    {!notif.read && (
                      <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}