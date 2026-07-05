import React, { useState, useEffect } from 'react';

const AdminPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [methodFilter, setMethodFilter] = useState('All');

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/admin/payments');
                const data = await res.json();
                setPayments(data);
            } catch (error) {
                console.error("Error building transactions ledger:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, []);

    const filteredPayments = payments.filter(payment => {
        const matchesSearch = payment.transaction_reference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              payment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              payment.enrollment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMethod = methodFilter === 'All' || payment.payment_method === methodFilter;
        return matchesSearch && matchesMethod;
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Loading ledger data...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900">Payment Ledger</h2>
                <p className="text-slate-500 mt-1">Monitor transactional history and settlement statuses.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between bg-slate-50/50">
                    <input 
                        type="text" 
                        placeholder="Search Txn ID, Name, or Enrollment..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-4 pr-4 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                    <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="py-2 px-3 border border-slate-200 rounded-xl text-sm">
                        <option value="All">All Methods</option>
                        <option value="Online">Online</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-xs uppercase border-b border-slate-200">
                                <th className="p-4 font-bold">Transaction Reference / Date</th>
                                <th className="p-4 font-bold">Student Details</th>
                                <th className="p-4 font-bold">Method</th>
                                <th className="p-4 font-bold">Amount Paid</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredPayments.map((payment) => (
                                <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900">{payment.transaction_reference}</div>
                                        <div className="text-xs text-slate-500">{new Date(payment.payment_date).toLocaleString('en-IN')}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{payment.student_name}</div>
                                        <div className="text-xs text-slate-500">{payment.enrollment}</div>
                                    </td>
                                    <td className="p-4 text-slate-600 font-medium">{payment.payment_method}</td>
                                    <td className="p-4 font-bold text-emerald-600">{formatCurrency(payment.amount_paid)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPayments;