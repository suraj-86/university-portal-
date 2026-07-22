import React from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.jsx';

const Navbar = ({ onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const userName = user?.full_name || 'Guest User';
  const rawRole = user?.role || 'Guest';
  
  const userRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNoticesClick = () => {
    const rolePath = userRole.toLowerCase(); 
    navigate(`/${rolePath}/notices`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 flex items-center justify-between px-4 sm:px-6 shadow-sm transition-all">
      
      {/* Left Side: Mobile Toggle & Branding/Welcome */}
      <div className="flex items-center gap-3 sm:gap-6">
        
        {/* Persistent Hamburger Menu */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        
        {/* Dynamic Welcome Message */}
        <div className="hidden sm:block">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-0.5">Welcome</p>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 leading-none">{userName}</h1>
        </div>
        
        {/* Mobile App Name Fallback */}
        <div className="sm:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm shadow-md">📖</div>
            <h1 className="text-slate-900 dark:text-slate-100 font-bold tracking-wide">UniPortal</h1>
        </div>
      </div>

      {/* Right Side: Notifications, Profile, & Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* Dynamic Notification Bell */}
        <button 
          onClick={handleNoticesClick}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
        </button>

        {/* Desktop Profile Badge */}
        <div className="hidden md:flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 pl-2 pr-4 py-1.5 border border-slate-100 dark:border-slate-700/60">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
            {userInitial}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{userName}</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{userRole} Portal</p>
          </div>
        </div>

        {/* Mobile Avatar */}
        <div className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
          {userInitial}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="hidden md:inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;