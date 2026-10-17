import { parseCSV } from './csv';

const MAX_BYTES = 2 * 1024 * 1024;

const isoFromDate = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const cellText = (v) => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) {
        if (Number.isNaN(v.getTime())) return '';
        if (v.getUTCFullYear() < 1910) return `${String(v.getUTCHours()).padStart(2, '0')}:${String(v.getUTCMinutes()).padStart(2, '0')}`;
        return isoFromDate(v);
    }
    return String(v).trim();
};

export const readTable = async (file) => {
    if (file.size > MAX_BYTES) throw new Error('File is too large (max 2 MB).');
    const name = file.name || '';
    if (/\.csv$/i.test(name)) {
        return parseCSV(await file.text());
    }
    if (/\.xlsx$/i.test(name)) {
        const { readSheet } = await import('read-excel-file/browser');
        let data;
        try {
            data = await readSheet(file);
        } catch {
            throw new Error('This file could not be read. Make sure it is a valid .xlsx file.');
        }
        return data.map((row) => row.map(cellText));
    }
    if (/\.xls$/i.test(name)) throw new Error('Old .xls files are not supported. In Excel use File > Save As > Excel Workbook (.xlsx).');
    throw new Error('Please choose an .xlsx or .csv file.');
};

export const normalizeHeader = (h) =>
    String(h ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const csvCell = (v) => {
    const s = String(v ?? '');
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
