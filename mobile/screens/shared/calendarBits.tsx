import React from 'react';
import { T } from '@/components/ui';

// Dates here are plain 'YYYY-MM-DD' strings, so they are formatted without time zones.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const parts = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };

export const todayISO = () => {
  try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); } catch { return new Date().toISOString().slice(0, 10); }
};

export const shortDate = (iso: string) => { const p = parts(iso); return `${DAYS[p.dow]}, ${p.d} ${MONTHS[p.m - 1].slice(0, 3)}`; };

export const rangeText = (start: string, end?: string | null) => {
  if (!end || end === start) return shortDate(start);
  const a = parts(start); const b = parts(end);
  return a.m === b.m ? `${a.d}–${b.d} ${MONTHS[a.m - 1].slice(0, 3)}` : `${a.d} ${MONTHS[a.m - 1].slice(0, 3)} – ${b.d} ${MONTHS[b.m - 1].slice(0, 3)}`;
};

export const daysBetween = (from: string, to: string) => {
  const a = parts(from); const b = parts(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
};

export const yearOptions = () => {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1].map((v) => ({ value: v, label: String(v) }));
};

export function MonthHeader({ ym }: { ym: string }) {
  const [y, m] = ym.split('-').map(Number);
  return <T v="label" style={{ marginTop: 4 }}>{MONTHS[m - 1]} {y}</T>;
}
