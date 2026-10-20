import React, { useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Table from '../../components/Table';
import useLoad from '../../hooks/useLoad';
import { money, plural } from '../../utils/dashboardUi';
import { ListHeader, FilterBar, LoadState } from '../../components/admin/ListParts';

const URLS = ['/admin/payments'];

const AdminPayments = () => {
    const { data, loading, error, reload } = useLoad(URLS);
    const payments = data ? data[0] : [];
    const [search, setSearch] = useState('');
    const [method, setMethod] = useState('');

    const methods = [...new Set(payments.map((p) => p.payment_method).filter(Boolean))].sort();
    const term = search.trim().toLowerCase();
    const shown = payments.filter((p) =>
        (!method || p.payment_method === method) &&
        (!term || [p.transaction_reference, p.student_name, p.enrollment, p.roll_number].some((v) => String(v || '').toLowerCase().includes(term))));
    const total = payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);

    const downloadReceipt = async (id) => {
        try {
            const res = await api.get(`/payments/${id}/receipt`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url; a.download = `payment-receipt-${id}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Unable to download receipt.');
        }
    };

    const columns = [
        { header: 'Reference', accessor: 'transaction_reference', cell: (r) => (
            <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{r.transaction_reference}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(r.payment_date).toLocaleString('en-IN')}</div>
            </div>
        ) },
        { header: 'Student', accessor: 'student_name', cell: (r) => (
            <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{r.student_name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Roll {r.roll_number || 'not assigned'}</div>
            </div>
        ) },
        { header: 'Method', accessor: 'payment_method' },
        { header: 'Amount', accessor: 'amount_paid', cell: (r) => <span className="font-bold text-emerald-700 dark:text-emerald-400">{money(r.amount_paid)}</span> },
        { header: '', accessor: 'receipt', cell: (r) => (
            <div className="flex justify-end">
                <button type="button" onClick={() => downloadReceipt(r.id)} aria-label={`Download receipt ${r.transaction_reference}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                    <Download size={14} aria-hidden="true" /> Receipt
                </button>
            </div>
        ) }
    ];

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <ListHeader title="Payments" line={data ? `${plural(payments.length, 'payment')} · ${money(total)} received` : 'Every payment recorded against a fee.'} />
            <LoadState loading={loading} error={error} onRetry={reload}>
                <FilterBar search={search} onSearch={setSearch} placeholder="Search reference, name, enrollment or roll" noun="payments"
                    shown={shown.length} total={payments.length} onClear={() => { setSearch(''); setMethod(''); }}
                    filters={methods.length > 1 ? [{ id: 'method', label: 'Method', value: method, onChange: setMethod, options: methods.map((m) => ({ value: m, label: m })) }] : []} />
                <Table columns={columns} data={shown} pageSize={10}
                    emptyText={payments.length ? 'No payment matches these filters.' : 'No payments have been recorded yet.'} />
            </LoadState>
        </div>
    );
};

export default AdminPayments;
