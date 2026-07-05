import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users2, BookOpen, CalendarCheck, BarChart3,
  ClipboardList, FileText, Award, User, DollarSign, Bell
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
  ],
  teacher: [
    { name: 'Dashboard', path: '/teacher-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'My Subjects', path: '/teacher/subjects', icon: <BookOpen size={20} /> },
    { name: 'Attendance', path: '/teacher/attendance', icon: <CalendarCheck size={20} /> },
    { name: 'Marks Entry', path: '/teacher/marks', icon: <ClipboardList size={20} /> },
    { name: 'Notices', path: '/teacher/notices', icon: <Bell size={20} /> },
  ],
  student: [
    { name: 'Dashboard', path: '/student-dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Profile', path: '/student/profile', icon: <User size={20} /> },
    { name: 'My Subjects', path: '/student/subjects', icon: <BookOpen size={20} /> },
    { name: 'Attendance', path: '/student/attendance', icon: <CalendarCheck size={20} /> },
    { name: 'Results', path: '/student/results', icon: <Award size={20} /> },
    { name: 'Fees', path: '/student/fees', icon: <DollarSign size={20} /> },
    { name: 'Notices', path: '/student/notices', icon: <Bell size={20} /> },
  ],
};

const Sidebar = ({ role = 'student', isOpen, onClose }) => {
  const menu = menuConfig[role] || menuConfig.student;

  return (
    <aside
      className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-lg lg:shadow-none transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
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
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`transition-transform duration-300 ${
                    isActive
                      ? 'scale-110 text-blue-600'
                      : 'group-hover:scale-110 text-slate-400 group-hover:text-slate-600'
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
    </aside>
  );
};

export default Sidebar;