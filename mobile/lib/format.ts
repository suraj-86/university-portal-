const TZ = 'Asia/Kolkata';

const safe = (fn: () => string, fallback: string) => { try { return fn(); } catch { return fallback; } };

export const todayLabel = () =>
  safe(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }), new Date().toDateString());

export const greeting = () => {
  const hour = safe(() => new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }), String(new Date().getHours()));
  const h = Number(hour);
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const money = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const plural = (n: number, one: string, many?: string) => `${n} ${n === 1 ? one : many || `${one}s`}`;

export const dateLabel = (v: any) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return safe(() => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }), d.toDateString());
};

export const weekLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return safe(() => new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }), iso.slice(5));
};

export const monthShort = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return safe(() => new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }), ym);
};
