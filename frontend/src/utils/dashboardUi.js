const TZ = 'Asia/Kolkata';

export const todayLabel = () =>
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });

export const greeting = () => {
    const hour = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }));
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

export const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const moneyShort = (v) => {
    const n = Number(v || 0);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₹${n}`;
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;

export const monthShort = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
};

export const weekLabel = (isoDate) => {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const BAND_SHORT = { 'Below 40%': 'Under 40%', '40-59%': '40-59%', '60-79%': '60-79%', '80% and above': '80%+' };
export const shortBand = (label) => BAND_SHORT[label] || label;
