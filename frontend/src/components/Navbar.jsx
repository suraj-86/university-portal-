import React, { useEffect, useState } from 'react';
import { Menu, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.jsx';
import api from '../services/api';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import { getPageTitle } from './navConfig';

const Navbar = ({ onToggle, sidebarOpen = false, role = 'student' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [counts, setCounts] = useState({ notices: 0, announcements: 0, messages: 0, notifications: 0 });
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const load = () => api.get('/inbox/counts')
      .then((res) => { if (!cancelled) setCounts(res.data); })
      .catch(() => {});
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 45000);
    window.addEventListener('inbox:refresh', load);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('inbox:refresh', load); };
  }, [user]);
  const [summary, setSummary] = useState('');
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    api.get('/me/summary').then((res) => { if (!cancelled) setSummary(res.data?.line || ''); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);
  const bellCount = counts.notifications || 0;
  const badge = (n) => (n > 99 ? '99+' : n);

  const userName = user?.full_name || 'Guest User';
  const rawRole = user?.role || 'Guest';
  
  const userRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  const userInitial = userName.charAt(0).toUpperCase();

  const pageTitle = getPageTitle(role, location.pathname);

  return (
    <header className={`fixed top-0 right-0 h-16 bg-gradient-to-r from-cyan-100/90 via-sky-100/90 to-blue-100/90 dark:from-[#0a2230]/95 dark:via-slate-900/95 dark:to-slate-900/95 backdrop-blur border-b border-cyan-200/70 dark:border-slate-800 z-50 flex items-center justify-between px-4 sm:px-6 transition-all duration-300 ${sidebarOpen ? 'left-0 lg:left-64' : 'left-0'}`}>
      
      <div className="flex items-center gap-3 sm:gap-6">
        
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition hover:bg-white dark:hover:bg-slate-700 focus:outline-none"
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        
        <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">

        {user?.role === 'admin' && <GlobalSearch />}
        
        <NotificationBell unread={bellCount} />

        {user?.role && user.role !== 'admin' && (
          <button
            onClick={() => navigate(`/${user.role}/messages`)}
            title="Messages"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <MessageSquare size={18} />
            {counts.messages > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900">{badge(counts.messages)}</span>
            )}
          </button>
        )}

        <div className="hidden md:flex items-center gap-3 rounded-2xl bg-white/70 dark:bg-slate-800 pl-2 pr-4 py-1.5 border border-white/80 dark:border-slate-700/60">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
            {userInitial}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Hello, {userName}</p>
            <p className="max-w-[220px] truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400" title={summary}>{summary || `${userRole} Portal`}</p>
          </div>
        </div>

        <div className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
          {userInitial}
        </div>

      </div>
    </header>
  );
};

export default Navbar;