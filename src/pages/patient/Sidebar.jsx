// src/pages/patient/PatientSidebar.jsx
import React from 'react';
import { LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings, Clock } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';

const PatientSidebar = ({ unreadMessages = 0 }) => {
  const patientLinks = [
    { name: 'Dashboard',        path: '/patient/dashboard', icon: LayoutDashboard },
    { name: 'My Sessions',      path: '/patient/sessions',  icon: Clock },
    { name: 'Book Appointment', path: '/patient/book',      icon: Calendar },
    { name: 'Mood Journal',     path: '/patient/journal',   icon: BookOpen },
    { name: 'Messages',         path: '/patient/messages',  icon: MessageCircle, badge: unreadMessages > 0 ? String(unreadMessages) : null },
    { name: 'Settings',         path: '/patient/settings',  icon: Settings },
  ];

  return <Sidebar links={patientLinks} userRole="patient" />;
};

export default PatientSidebar;