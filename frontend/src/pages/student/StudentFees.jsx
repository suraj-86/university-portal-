import React, { useState, useEffect } from 'react';
import { CreditCard, Download, CheckCircle2, Clock, Landmark, FileText, ArrowRight, Banknote, ShieldCheck, Loader2 } from 'lucide-react';
import useAuth from '../../hooks/useAuth'; 

const StudentFees = () => { 
    const { user } = useAuth();
    // Fallback to 5 if user context isn't fully set up yet, otherwise use real ID
    const userId = user?.id || 5;    

    // --- STATE ---
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [dbFees, setDbFees] = useState([]);
    const [dbPayments, setDbPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Payment Flow State
    const [paymentStep, setPaymentStep] = useState(1); // 1 = Details, 2 = Confirmation, 3 = Processing
    const [selectedFeeId, setSelectedFeeId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Online');

    // --- FETCH LIVE DATA ---
    const fetchData = async () => {
        try {
            setLoading(true);
            const feesRes = await fetch(`http://localhost:5000/api/student/${userId}/fees`);
            const feesData = await feesRes.json();
            setDbFees(feesData);

            const payRes = await fetch(`http://localhost:5000/api/student/${userId}/payments`);
            const payData = await payRes.json();
            setDbPayments(payData);
        } catch (error) {
            console.error("Error fetching fee records:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userId]);

    // --- DERIVED STATS ---
    const overallTotal = dbFees.reduce((sum, fee) => sum + Number(fee.total_fee), 0);
    const overallPaid = dbFees.reduce((sum, fee) => sum + Number(fee.paid_amount), 0);
    const overallDue = overallTotal - overallPaid;
    const percentCleared = overallTotal > 0 ? Math.round((overallPaid / overallTotal) * 100) : 0;

    const pendingFees = dbFees.filter(fee => fee.status !== 'Paid');

    // --- HANDLERS ---
    const handleFeeSelection = (e) => {
        const feeId = e.target.value;
        setSelectedFeeId(feeId);
        
        const feeRecord = pendingFees.find(f => f.id.toString() === feeId);
        if (feeRecord) {
            setPaymentAmount((feeRecord.total_fee - feeRecord.paid_amount).toString());
        } else {
            setPaymentAmount('');
        }
    };

    const handleProceedToGateway = (e) => {
        e.preventDefault();
        if (!selectedFeeId || !paymentAmount) return;
        setPaymentStep(2); // Move to Confirmation Step
    };

    const handleProcessPayment = async () => {
        setPaymentStep(3); // Show processing spinner
        
        const paymentPayload = {
            fee_id: parseInt(selectedFeeId),
            amount_paid: parseFloat(paymentAmount),
            payment_method: paymentMethod, 
            transaction_reference: `TXN-${Date.now()}` 
        };
        
        try {
            // Simulate a 1.5 second network/gateway delay for realism
            await new Promise(resolve => setTimeout(resolve, 1500));

            const response = await fetch('http://localhost:5000/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentPayload)
            });
            const data = await response.json();
            
            if (data.success) {
                alert(`Successfully paid ₹${paymentAmount} via ${paymentMethod}!`);
                closeModal();
                fetchData(); 
            } else {
                alert(data.error || "Payment failed to record.");
                setPaymentStep(2); // Go back to confirm if failed
            }
        } catch (error) {
            alert("Network error processing payment.");
            setPaymentStep(2);
        }
    };

    const closeModal = () => {
        setIsPaymentModalOpen(false);
        setPaymentStep(1);
        setSelectedFeeId('');
        setPaymentAmount('');
    };

    if (loading) {
        return <div className="p-10 text-center font-semibold text-slate-500">Loading statements...</div>;
    }

    return (
        <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Fee Management</h2>
                    <p className="text-slate-500 mt-1">Review your statement and clear pending dues.</p>
                </div>
                {pendingFees.length > 0 && (
                    <button 
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm flex items-center gap-2"
                    >
                        <CreditCard size={18} /> Pay Dues
                    </button>
                )}
            </header>

            {/* --- MACRO STATS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                        {overallDue > 0 ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">Dues Pending</span>
                        ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">All Cleared</span>
                        )}
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Outstanding</p>
                    <h3 className="text-3xl font-black text-slate-900">₹{overallDue.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <CheckCircle2 size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
                    <h3 className="text-3xl font-black text-slate-900">₹{overallPaid.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Semester Fee</p>
                        <h3 className="text-3xl font-black text-slate-900">₹{overallTotal.toLocaleString()}</h3>
                    </div>
                    <div className="mt-6">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span>Semester Clearance</span>
                            <span>{percentCleared}% Cleared</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${percentCleared}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- DETAILED VIEW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Fee Ledger */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <FileText size={20} className="text-slate-500" />
                            <h3 className="font-bold text-slate-900">Fee Ledger</h3>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        {dbFees.map(fee => (
                            <div key={fee.id} className="p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{fee.fee_type} <span className="text-xs font-medium text-slate-400">(Sem {fee.semester})</span></h4>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">Due: {new Date(fee.due_date).toLocaleDateString('en-IN')}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                                        ${fee.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                        {fee.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-0.5 uppercase">Total / Paid</p>
                                        <p className="text-sm font-bold text-slate-700">₹{Number(fee.total_fee).toLocaleString()} / <span className="text-emerald-600">₹{Number(fee.paid_amount).toLocaleString()}</span></p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {dbFees.length === 0 && <div className="text-center py-8 text-slate-400">No fees assigned.</div>}
                    </div>
                </div>

                {/* Right: History */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-900">Transaction History</h3>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                        {dbPayments.map((txn) => (
                            <div key={txn.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{txn.transaction_reference}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                                            {new Date(txn.payment_date).toLocaleDateString('en-IN')} • {txn.payment_method} • <span className="font-bold text-slate-700">{txn.fee_type}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-emerald-600">₹{Number(txn.amount_paid).toLocaleString()}</span>
                                    <button className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-wider">
                                        <Download size={12} /> Receipt
                                    </button>
                                </div>
                            </div>
                        ))}
                        {dbPayments.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No payments recorded yet.</div>}
                    </div>
                </div>
            </div>

            {/* --- MULTI-STEP PAYMENT MODAL --- */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">
                                    {paymentStep === 1 ? 'Clear Dues' : paymentStep === 2 ? 'Confirm Payment' : 'Processing...'}
                                </h3>
                                {paymentStep === 1 && <p className="text-xs text-slate-500 mt-0.5">Select a fee and payment method</p>}
                                {paymentStep === 2 && <p className="text-xs text-slate-500 mt-0.5">Review your transaction details</p>}
                            </div>
                            {paymentStep !== 3 && (
                                <button onClick={closeModal} className="text-slate-400 hover:text-slate-800 font-bold text-xl">×</button>
                            )}
                        </div>
                        
                        {/* STEP 1: FORM */}
                        {paymentStep === 1 && (
                            <form onSubmit={handleProceedToGateway} className="p-6">
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">1. Select Outstanding Fee</label>
                                    <select 
                                        required
                                        value={selectedFeeId}
                                        onChange={handleFeeSelection}
                                        className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white cursor-pointer"
                                    >
                                        <option value="" disabled>-- Choose a pending fee --</option>
                                        {pendingFees.map(fee => (
                                            <option key={fee.id} value={fee.id}>
                                                {fee.fee_type} (₹{(fee.total_fee - fee.paid_amount).toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-6">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">2. Amount to Pay</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                                        <input type="number" disabled value={paymentAmount} placeholder="Select a fee above" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl font-black text-xl text-slate-500 bg-slate-100 cursor-not-allowed"/>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">3. Payment Method</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button type="button" onClick={() => setPaymentMethod('Online')} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${paymentMethod === 'Online' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                            <CreditCard size={20} className="mb-2" />
                                            <span className="text-[10px] font-bold uppercase text-center">Online</span>
                                        </button>
                                        <button type="button" onClick={() => setPaymentMethod('Bank Transfer')} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${paymentMethod === 'Bank Transfer' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                            <Landmark size={20} className="mb-2" />
                                            <span className="text-[10px] font-bold uppercase text-center">Bank</span>
                                        </button>
                                        <button type="button" onClick={() => setPaymentMethod('Cash')} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${paymentMethod === 'Cash' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                            <Banknote size={20} className="mb-2" />
                                            <span className="text-[10px] font-bold uppercase text-center">Cash</span>
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={!selectedFeeId || !paymentAmount} className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                                    Proceed to Checkout <ArrowRight size={16} />
                                </button>
                            </form>
                        )}

                        {/* STEP 2: CONFIRMATION GATEWAY */}
                        {paymentStep === 2 && (
                            <div className="p-6">
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center mb-6">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 mb-1">Secure Payment Authorization</p>
                                    <h2 className="text-3xl font-black text-slate-900">₹{Number(paymentAmount).toLocaleString()}</h2>
                                    <p className="text-xs font-bold text-slate-500 uppercase mt-2">Via {paymentMethod}</p>
                                </div>

                                {paymentMethod === 'Cash' ? (
                                    <p className="text-sm text-slate-600 text-center mb-6 bg-slate-100 p-4 rounded-xl">
                                        By confirming, a <b>Cash Challan</b> will be generated. You must deposit the physical cash at the Accounts Office within 48 hours.
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-600 text-center mb-6 bg-slate-100 p-4 rounded-xl">
                                        You are about to initiate a secure transaction. Please do not refresh the page once the payment starts.
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setPaymentStep(1)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={handleProcessPayment} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                                        Confirm & Pay
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PROCESSING SPINNER */}
                        {paymentStep === 3 && (
                            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                                <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
                                <h3 className="font-bold text-lg text-slate-900">Processing Transaction...</h3>
                                <p className="text-sm text-slate-500 mt-2">Contacting bank servers. Please do not close this window.</p>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentFees;