const { TZ } = require('./time');

const MAX_ROWS = 5000;

class ReportError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
const bad = (message) => new ReportError(400, message);
const forbidden = (message) => new ReportError(403, message);

const num = (v) => Number(v) || 0;
const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;
const percent = (part, whole) => (whole > 0 ? round1((part / whole) * 100) : null);

const isoDate = (v) => {
    if (!v) return '';
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
    return String(v).slice(0, 10);
};

const stampFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const partsOf = (date) => Object.fromEntries(stampFormat.formatToParts(date).map((p) => [p.type, p.value]));

const stamp = (v) => {
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const p = partsOf(d);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};
const dayInTZ = (v) => {
    const d = v instanceof Date ? v : new Date(v);
    const p = partsOf(d);
    return `${p.year}-${p.month}-${p.day}`;
};
const offsetMs = (date) => {
    const p = partsOf(date);
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(date.getTime() / 1000) * 1000;
};
const startOfDay = (iso) => {
    const guess = new Date(`${iso}T00:00:00Z`);
    let d = new Date(guess.getTime() - offsetMs(guess));
    const again = offsetMs(d);
    if (guess.getTime() - d.getTime() !== again) d = new Date(guess.getTime() - again);
    return d;
};
const nextDay = (iso) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
const lastDayOfMonth = (month) => {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

const prettyDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const build = ({ title, filters = [], columns, rows, summary = [] }) => {
    const truncated = rows.length > MAX_ROWS;
    return {
        title,
        subtitle: filters.filter(Boolean).join(' · '),
        generated_at: new Date().toISOString(),
        columns,
        rows: truncated ? rows.slice(0, MAX_ROWS) : rows,
        total_rows: Math.min(rows.length, MAX_ROWS),
        truncated,
        max_rows: MAX_ROWS,
        summary: truncated ? [] : summary
    };
};

module.exports = {
    MAX_ROWS, ReportError, bad, forbidden, num, round1, round2, percent, isoDate, stamp, dayInTZ,
    startOfDay, nextDay, lastDayOfMonth, prettyDate, build
};
