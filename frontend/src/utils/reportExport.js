import { downloadTextFile } from './csv';

const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const displayCell = (value, type) => {
    if (value === null || value === undefined || value === '') return '';
    if (type === 'money') return `₹${inr.format(Number(value))}`;
    if (type === 'percent') return `${Number(value)}%`;
    return String(value);
};

export const displaySummary = (item) => displayCell(item.value, item.type);

const safeText = (v) => {
    const s = String(v ?? '');
    return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

const csvField = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const fileStem = (report) => {
    const slug = String(report.title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${slug || 'report'}-${new Date().toISOString().slice(0, 10)}`;
};

export const toCsv = (report) => {
    const head = report.columns.map((c) => csvField(c.label)).join(',');
    const body = report.rows.map((row) =>
        report.columns.map((c) => {
            const v = row[c.key];
            if (v === null || v === undefined) return '';
            return csvField(typeof v === 'number' ? v : safeText(v));
        }).join(','));
    return '\uFEFF' + `${[head, ...body].join('\r\n')}\r\n`;
};

export const downloadCsv = (report) => downloadTextFile(`${fileStem(report)}.csv`, toCsv(report));

export const buildSheetData = (report) => {
    const bold = (value) => ({ value, fontWeight: 'bold' });
    const data = [[{ value: report.title, fontWeight: 'bold', fontSize: 14 }]];
    if (report.subtitle) data.push([{ value: report.subtitle }]);
    data.push([{ value: `Generated ${report.generated_at}` }]);
    data.push([]);
    data.push(report.columns.map((c) => ({ ...bold(c.label), wrap: true, align: c.type && c.type !== 'text' ? 'right' : 'left' })));
    report.rows.forEach((row) => {
        data.push(report.columns.map((c) => {
            const v = row[c.key];
            if (v === null || v === undefined || v === '') return null;
            if (typeof v === 'number') {
                if (c.type === 'money') return { value: v, type: Number, format: '#,##0.00' };
                if (c.type === 'percent') return { value: v, type: Number, format: '0.0' };
                return { value: v, type: Number };
            }
            return { value: safeText(v), type: String };
        }));
    });
    if (report.summary && report.summary.length) {
        data.push([]);
        report.summary.forEach((s) => {
            data.push([bold(s.label), typeof s.value === 'number'
                ? { value: s.value, type: Number, format: s.type === 'money' ? '#,##0.00' : undefined }
                : { value: String(s.value), type: String }]);
        });
    }
    return data;
};

export const columnWidths = (report) =>
    report.columns.map((c) => {
        const longest = report.rows.reduce((m, r) => Math.max(m, String(r[c.key] ?? '').length), 0);
        if (c.narrow) return { width: 5 };
        return { width: Math.min(40, Math.max(10, Math.min(c.label.length, 24), longest + 2)) };
    });

export const downloadXlsx = async (report) => {
    const { default: writeExcelFile } = await import('write-excel-file/universal');
    const blob = await writeExcelFile(buildSheetData(report), { columns: columnWidths(report), sheet: 'Report' }).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileStem(report)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};
