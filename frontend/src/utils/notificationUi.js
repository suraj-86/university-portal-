import { Bell, Megaphone, MessageSquare, DollarSign, Building2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

const META = {
    notice: { Icon: Bell, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' },
    announcement: { Icon: Megaphone, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400' },
    message: { Icon: MessageSquare, tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' },
    fee: { Icon: DollarSign, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' },
    payment: { Icon: DollarSign, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' },
    fee_reminder: { Icon: AlertCircle, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' },
    hostel: { Icon: Building2, tone: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400' },
    timetable: { Icon: Clock, tone: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400' },
    security: { Icon: ShieldCheck, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' }
};

export const typeMeta = (type) => META[type] || META.notice;

export const timeAgo = (iso) => {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const mins = Math.floor((Date.now() - then.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return then.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
