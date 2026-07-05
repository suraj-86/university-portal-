import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Users } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Table from '../../components/Table';

const ParentFees = () => {
    const { user } = useAuth();
    const [fees, setFees] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedWardId, setSelectedWardId] = useState('');
    const [allWards, setAllWards] = useState([]);

    useEffect(() => {
        const fetchFinancials = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                const url = selectedWardId 
                    ? `http://localhost:5000/api/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
                    : `http://localhost:5000/api/parent/${user.id}/wards-overview`;

                const summaryRes = await fetch(url);
                const summaryData = await summaryRes.json();
                
                if (summaryData.childProfile) {
                    setAllWards(summaryData.allWards || []);
                    if (!selectedWardId) setSelectedWardId(summaryData.childProfile.student_id);

                    const childUserId = summaryData.childProfile.user_id;
                    const [feesRes, paymentsRes] = await Promise.all([
                        fetch(`http://localhost:5000/api/student/${childUserId}/fees`),
                        fetch(`http://localhost:5000/api/student/${childUserId}/payments`)
                    ]);
                    setFees(await feesRes.json());
                    setPayments(await paymentsRes.json());
                }
            } catch (error) {
                console.error("Error fetching financials:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFinancials();
    }, [user, selectedWardId]);

    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    const feeColumns = [
        { header: "Fee Type", accessor: "fee_type", cell: (row) => <span className="font-bold text-slate-900">{row.fee_type} <span className="text-xs text-slate-400 block">Sem {row.semester}</span></span> },
        { header: "Total / Paid", accessor: "amount", cell: (row) => <span className="font-bold text-slate-700">{formatCurrency(row.total_fee)} / <span className="text-emerald-600">{formatCurrency(row.paid_amount)}</span></span> },
        { header: "Due Date", accessor: "due_date", cell: (row) => <span className="text-slate-500">{new Date(row.due_date).toLocaleDateString('en-IN')}</span> },
        { header: "Status", accessor: "status", cell: (row) => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{row.status}</span> }
    ];

    const paymentColumns = [
        { header: "Ref ID / Date", accessor: "ref", cell: (row) => <div><span className="font-bold text-slate-900">{row.transaction_reference}</span><span className="text-xs text-slate-500 block">{new Date(row.payment_date).toLocaleDateString('en-IN')}</span></div> },
        { header: "Method", accessor: "payment_method", cell: (row) => <span className="font-medium text-slate-600">{row.payment_method}</span> },
        { header: "Amount Paid", accessor: "amount_paid", cell: (row) => <span className="font-bold text-emerald-600">{formatCurrency(row.amount_paid)}</span> }
    ];

    if (loading && fees.length === 0) return <div className="p-10 text-slate-500 font-bold animate-pulse uppercase tracking-widest text-sm">Loading Financials...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Fees & Payments</h2>
                    <p className="text-slate-500 mt-1 font-medium">Monitor your ward's financial ledger.</p>
                </div>
                
                {allWards.length > 1 && (
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <Users size={18} className="text-indigo-600" />
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Ward</p>
                            <select 
                                value={selectedWardId} 
                                onChange={(e) => setSelectedWardId(e.target.value)}
                                className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                            >
                                {allWards.map(ward => (
                                    <option key={ward.student_id} value={ward.student_id}>
                                        {ward.full_name} ({ward.course_name})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText size={18} className="text-indigo-600"/> Fee Ledger</h3>
                    </div>
                    <Table columns={feeColumns} data={fees} pageSize={10} />
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600"/> Payment History</h3>
                    </div>
                    <Table columns={paymentColumns} data={payments} pageSize={10} />
                </div>
            </div>
        </div>
    );
};

export default ParentFees;