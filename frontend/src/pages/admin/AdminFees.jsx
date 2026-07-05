import React, { useState, useEffect } from 'react';

const AdminFees = () => {
    const [feeRecords, setFeeRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [courseFilter, setCourseFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    const fetchAdminFees = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/fees');
            const data = await res.json();
            setFeeRecords(data);
        } catch (error) {
            console.error("Error fetching admin metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminFees();
    }, []);

    // Macro Stats calculation from live rows
    const totalExpected = feeRecords.reduce((sum, r) => sum + Number(r.total_fee), 0);
    const totalCollected = feeRecords.reduce((sum, r) => sum + Number(r.paid_amount), 0);
    const outstandingDues = totalExpected - totalCollected;
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    const filteredRecords = feeRecords.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              record.enrollment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCourse = courseFilter === 'All' || record.course === courseFilter;
        const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
        return matchesSearch && matchesCourse && matchesStatus;
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Loading master fees ledger...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Fee Management</h2>
                    <p className="text-slate-500 mt-1">Track student dues, record payments, and manage invoices live.</p>
                </div>
            </header>

            {/* Macro Statistics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Expected</p>
                    <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpected)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Collected</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Outstanding Dues</p>
                    <h3 className="text-2xl font-bold text-orange-500">{formatCurrency(outstandingDues)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Collection Rate ({collectionRate}%)</p>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${collectionRate}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Table layout remains identical, just uses the dynamic filteredRecords */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
                    <input 
                        type="text" 
                        placeholder="Search Name or Enrollment..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-4 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm bg-white"
                    />
                    <div className="flex gap-4">
                        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="py-2 px-3 border border-slate-200 rounded-xl text-sm">
                            <option value="All">All Courses</option>
                            <option value="BCA">BCA</option>
                            <option value="BBA">BBA</option>
                            <option value="MBA">MBA</option>
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="py-2 px-3 border border-slate-200 rounded-xl text-sm">
                            <option value="All">All Statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-xs uppercase border-b border-slate-200">
                                <th className="p-4 font-bold">Student Info</th>
                                <th className="p-4 font-bold">Course / Sem</th>
                                <th className="p-4 font-bold">Fee Type</th>
                                <th className="p-4 font-bold">Total / Paid</th>
                                <th className="p-4 font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900">{record.name}</div>
                                        <div className="text-xs text-slate-500">{record.enrollment}</div>
                                    </td>
                                    <td className="p-4 font-medium text-slate-600">{record.course} <span className="text-slate-400">S{record.semester}</span></td>
                                    <td className="p-4 font-semibold text-slate-700">{record.fee_type}</td>
                                    <td className="p-4 font-bold">
                                        {formatCurrency(record.total_fee)} / <span className="text-emerald-600">{formatCurrency(record.paid_amount)}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase
                                            ${record.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminFees;