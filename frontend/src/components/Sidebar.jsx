import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { menuConfig } from './navConfig';

const Sidebar = ({ role = 'student', isOpen, onClose }) => {
  const menu = menuConfig[role] || menuConfig.student;
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside
      aria-label="Main navigation"
      className={`fixed inset-y-0 left-0 z-[60] w-64 flex flex-col bg-gradient-to-b from-cyan-100 via-sky-100 to-teal-50 dark:from-[#0a2230] dark:via-[#0b2a3a] dark:to-[#08161f] border-r border-cyan-200/70 dark:border-cyan-900/40 shadow-xl lg:shadow-none transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col items-center text-center px-4 pt-5 pb-4 text-cyan-950 dark:text-cyan-50">
        <img src="/bbau-icon.png" alt="" className="w-14 h-14 rounded-2xl bg-white p-1 shadow-md ring-1 ring-cyan-200" />
        <p className="mt-3 text-[13px] font-black tracking-wide leading-snug">BABASAHEB BHIMRAO AMBEDKAR UNIVERSITY</p>
        <p className="text-[10px] font-semibold text-cyan-800 dark:text-cyan-200 leading-tight">(A Central University)</p>
        <p className="mt-1.5 text-[11px] font-bold tracking-wider text-cyan-800 dark:text-cyan-100 leading-tight border-t border-cyan-300/60 dark:border-white/20 pt-1.5 w-full">SATELLITE CAMPUS AMETHI</p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col mx-3 mb-3 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-md ring-1 ring-cyan-100 dark:ring-cyan-900/40">
        <nav className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto custom-scrollbar">
          {menu.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                  isActive
                    ? 'bg-cyan-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-cyan-50 dark:hover:bg-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut size={20} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
