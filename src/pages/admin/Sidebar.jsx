/**
 * AdminSidebar.jsx
 * Drop-in sidebar for all doctor/admin pages.
 * Usage:  <AdminSidebar />
 * No props needed — handles its own unread-message badge via API + socket.
 */

import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Calendar, BarChart3,
  MessageCircle, Settings, ClipboardList,
} from 'lucide-react';
import Sidebar from './Sidebar';                      // existing Sidebar renderer
import { messageAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const BASE_LINKS = [
  { name: 'Dashboard',      path: '/admin/dashboard',      icon: LayoutDashboard },
  { name: 'Patients',       path: '/admin/patients',       icon: Users },
  { name: 'Calendar',       path: '/admin/calendar',       icon: Calendar },
  { name: 'Analytics',      path: '/admin/analytics',      icon: BarChart3 },
  { name: 'Questionnaires', path: '/admin/questionnaires', icon: ClipboardList },
  { name: 'Messages',       path: '/admin/messages',       icon: MessageCircle, _badgeKey: true },
  { name: 'Settings',       path: '/admin/settings',       icon: Settings },
];

export default function AdminSidebar() {
  const [unread, setUnread] = useState(0);

  /* ── Initial fetch ─────────────────────────────────────── */
  useEffect(() => {
    messageAPI.getConversations()
      .then(({ data }) => {
        const total = (data.conversations || [])
          .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnread(total);
      })
      .catch(() => {});
  }, []);

  /* ── Real-time: new incoming message bumps the badge ───── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg) => {
      // Only bump if we're NOT currently on the messages page
      if (!window.location.pathname.includes('/admin/messages')) {
        setUnread((prev) => prev + 1);
      }
    };

    socket.on('message:receive', onMessage);
    return () => socket.off('message:receive', onMessage);
  }, []);

  /* ── Reset badge when user navigates to messages ───────── */
  useEffect(() => {
    if (window.location.pathname.includes('/admin/messages')) {
      setUnread(0);
    }
  });

  /* ── Build links with live badge ───────────────────────── */
  const links = BASE_LINKS.map((link) =>
    link._badgeKey
      ? { ...link, badge: unread > 0 ? String(unread) : null }
      : link,
  );

  return <Sidebar links={links} userRole="admin" />;
}