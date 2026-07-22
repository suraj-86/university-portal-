import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users2, BookOpen, CalendarCheck, BarChart3,
  ClipboardList, FileText, Award, User, DollarSign, Bell, Settings, Sun, Moon
} from 'lucide-react';

const menuConfig = {
  admin: [
    { name: 'Dashboard', path: '/admin-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Students', path: '/admin/students', icon: <User size={20} /> },
    { name: 'Teachers', path: '/admin/teachers', icon: <Users2 size={20} /> },
    { name: 'Courses', path: '/admin/courses', icon: <BookOpen size={20} /> },
    { name: 'Subjects', path: '/admin/subjects', icon: <FileText size={20} /> },
    { name: 'Fees', path: '/admin/fees', icon: <DollarSign size={20} /> },
    { name: 'Payments', path: '/admin/payments', icon: <BarChart3 size={20} /> },
    { name: 'Notices', path: '/admin/notices', icon: <Bell size={20} /> },
    { name: 'Parents', path: '/admin/parents', icon: <Users2 size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> }
  ],
  teacher: [
    { name: 'Dashboard', path: '/teacher-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'My Subjects', path: '/teacher/subjects', icon: <BookOpen size={20} /> },
    { name: 'Attendance', path: '/teacher/attendance', icon: <CalendarCheck size={20} /> },
    { name: 'Marks Entry', path: '/teacher/marks', icon: <ClipboardList size={20} /> },
    { name: 'Notices', path: '/teacher/notices', icon: <Bell size={20} /> },
    { name: 'Settings', path: '/teacher/settings', icon: <Settings size={20} /> }
  ],
  student: [
    { name: 'Dashboard', path: '/student-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Profile', path: '/student/profile', icon: <User size={20} /> },
    { name: 'My Subjects', path: '/student/subjects', icon: <BookOpen size={20} /> },
    { name: 'Attendance', path: '/student/attendance', icon: <CalendarCheck size={20} /> },
    { name: 'Results', path: '/student/results', icon: <Award size={20} /> },
    { name: 'Fees', path: '/student/fees', icon: <DollarSign size={20} /> },
    { name: 'Notices', path: '/student/notices', icon: <Bell size={20} /> },
    { name: 'Settings', path: '/student/settings', icon: <Settings size={20} /> }
  ],
  parent: [
    { name: 'Dashboard', path: '/parent-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Ward Profile', path: '/parent/profile', icon: <User size={20} /> },
    { name: 'Fees & Payments', path: '/parent/fees', icon: <DollarSign size={20} /> },
    { name: 'Academic Results', path: '/parent/results', icon: <Award size={20} /> },
    { name: 'Campus Notices', path: '/parent/notices', icon: <Bell size={20} /> },
    { name: 'Settings', path: '/parent/settings', icon: <Settings size={20} /> }
  ],
};

const Sidebar = ({ role = 'student', isOpen, onClose }) => {
  const menu = menuConfig[role] || menuConfig.student;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <aside
      className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 shadow-lg lg:shadow-none transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Main Menu
        </p>
        
        {menu.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`transition-transform duration-300 ${
                    isActive
                      ? 'scale-110 text-blue-600 dark:text-blue-400'
                      : 'group-hover:scale-110 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all group"
        >
          <span className="text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform">
            {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </span>
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;