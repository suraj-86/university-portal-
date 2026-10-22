import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users2, BookOpen, CalendarCheck, BarChart3,
  ClipboardList, FileText, Award, User, DollarSign, Bell, Settings, Calendar, CalendarDays, Clock3, Megaphone, MessageSquare, Building2, LifeBuoy, Contact, History, ShieldCheck, FileSpreadsheet
} from 'lucide-react';

export const menuConfig = {
  admin: [
    { name: 'Dashboard', path: '/admin-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Students', path: '/admin/students', icon: <User size={20} /> },
    { name: 'Teachers', path: '/admin/teachers', icon: <Users2 size={20} /> },
    { name: 'Courses', path: '/admin/courses', icon: <BookOpen size={20} /> },
    { name: 'Subjects', path: '/admin/subjects', icon: <FileText size={20} /> },
    { name: 'Fees', path: '/admin/fees', icon: <DollarSign size={20} /> },
    { name: 'Payments', path: '/admin/payments', icon: <BarChart3 size={20} /> },
    { name: 'Reports', path: '/admin/reports', icon: <FileSpreadsheet size={20} /> },
    { name: 'Notices', path: '/admin/notices', icon: <Bell size={20} /> },
    { name: 'Announcements', path: '/admin/announcements', icon: <Megaphone size={20} /> },
    { name: 'Parents', path: '/admin/parents', icon: <Users2 size={20} /> },
    { name: 'Timetable', path: '/admin/timetable', icon: <Clock3 size={20} /> },
    { name: 'Hostel', path: '/admin/hostel', icon: <Building2 size={20} /> },
    { name: 'University Contacts', path: '/admin/contacts', icon: <Contact size={20} /> },
    { name: 'Academic Calendar', path: '/admin/calendar', icon: <CalendarDays size={20} /> },
    { name: 'Holidays', path: '/admin/holidays', icon: <Calendar size={20} /> },
    { name: 'Admins', path: '/admin/admins', icon: <ShieldCheck size={20} /> },
    { name: 'Audit Log', path: '/admin/audit', icon: <History size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> }
  ],
  teacher: [
    { name: 'Dashboard', path: '/teacher-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'My Subjects', path: '/teacher/subjects', icon: <BookOpen size={20} /> },
    { name: 'Attendance', path: '/teacher/attendance', icon: <CalendarCheck size={20} /> },
    { name: 'Marks Entry', path: '/teacher/marks', icon: <ClipboardList size={20} /> },
    { name: 'Reports', path: '/teacher/reports', icon: <FileSpreadsheet size={20} /> },
    { name: 'Notices', path: '/teacher/notices', icon: <Bell size={20} /> },
    { name: 'Announcements', path: '/teacher/announcements', icon: <Megaphone size={20} /> },
    { name: 'Messages', path: '/teacher/messages', icon: <MessageSquare size={20} /> },
    { name: 'Student & Parent Contacts', path: '/teacher/contacts', icon: <Contact size={20} /> },
    { name: 'Timetable', path: '/teacher/timetable', icon: <Clock3 size={20} /> },
    { name: 'Academic Calendar', path: '/teacher/calendar', icon: <CalendarDays size={20} /> },
    { name: 'Holidays', path: '/teacher/holidays', icon: <Calendar size={20} /> },
    { name: 'Help & Contacts', path: '/teacher/help', icon: <LifeBuoy size={20} /> },
    { name: 'Settings', path: '/teacher/settings', icon: <Settings size={20} /> }
  ],
  student: [
    { name: 'Dashboard', path: '/student-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Profile', path: '/student/profile', icon: <User size={20} /> },
    { name: 'My Subjects', path: '/student/subjects', icon: <BookOpen size={20} /> },
    { name: 'Attendance', path: '/student/attendance', icon: <CalendarCheck size={20} /> },
    { name: 'Results', path: '/student/results', icon: <Award size={20} /> },
    { name: 'Report Card', path: '/student/report-card', icon: <ClipboardList size={20} /> },
    { name: 'Statements', path: '/student/reports', icon: <FileSpreadsheet size={20} /> },

    { name: 'Hostel', path: '/student/hostel', icon: <Building2 size={20} /> },

    { name: 'Fees', path: '/student/fees', icon: <DollarSign size={20} /> },
    { name: 'Notices', path: '/student/notices', icon: <Bell size={20} /> },
    { name: 'Announcements', path: '/student/announcements', icon: <Megaphone size={20} /> },
    { name: 'Messages', path: '/student/messages', icon: <MessageSquare size={20} /> },
    { name: 'Timetable', path: '/student/timetable', icon: <Clock3 size={20} /> },
    { name: 'Academic Calendar', path: '/student/calendar', icon: <CalendarDays size={20} /> },
    { name: 'Holidays', path: '/student/holidays', icon: <Calendar size={20} /> },
    { name: 'Help & Contacts', path: '/student/help', icon: <LifeBuoy size={20} /> },
    { name: 'Settings', path: '/student/settings', icon: <Settings size={20} /> }
  ],
  parent: [
    { name: 'Dashboard', path: '/parent-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Ward Profile', path: '/parent/profile', icon: <User size={20} /> },
    { name: 'Fees & Payments', path: '/parent/fees', icon: <DollarSign size={20} /> },  
    { name: 'Attendance', path: '/parent/attendance', icon: <CalendarCheck size={20} /> },
    { name: 'Academic Results', path: '/parent/results', icon: <Award size={20} /> },
    { name: 'Report Card', path: '/parent/report-card', icon: <ClipboardList size={20} /> },
    { name: 'Statements', path: '/parent/reports', icon: <FileSpreadsheet size={20} /> },

    { name: 'Hostel', path: '/parent/hostel', icon: <Building2 size={20} /> },

    { name: 'Campus Notices', path: '/parent/notices', icon: <Bell size={20} /> },
    { name: 'Announcements', path: '/parent/announcements', icon: <Megaphone size={20} /> },
    { name: 'Messages', path: '/parent/messages', icon: <MessageSquare size={20} /> },
    { name: 'Timetable', path: '/parent/timetable', icon: <Clock3 size={20} /> },
    { name: 'Academic Calendar', path: '/parent/calendar', icon: <CalendarDays size={20} /> },
    { name: 'Holidays', path: '/parent/holidays', icon: <Calendar size={20} /> },
    { name: 'Help & Contacts', path: '/parent/help', icon: <LifeBuoy size={20} /> },
    { name: 'Settings', path: '/parent/settings', icon: <Settings size={20} /> }
    
  ],
};

// Name of the page for the top bar, from the sidebar entry that matches the address.
export const getPageTitle = (role, pathname) => {
  const items = menuConfig[role] || [];
  const hit = items.filter((i) => pathname === i.path || pathname.startsWith(`${i.path}/`)).sort((x, y) => y.path.length - x.path.length)[0];
  if (hit) return hit.name;
  const last = pathname.split('/').filter(Boolean).pop() || 'Portal';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
