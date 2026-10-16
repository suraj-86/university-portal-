import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Building2, LogOut, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from '../../components/Modal';
import Table from '../../components/Table';
import Input from '../../components/FormInput';

const selectCls = 'w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none';
const filterCls = 'py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none';
const labelCls = 'text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1';

const defaultSession = () => {
    const d = new Date();
    const y = d.getFullYear();
    return d.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const EMPTY_ALLOCATION = { student_id: '', hostel_id: '', block: '', room_number: '', academic_session: '', semester: '', remarks: '' };
const EMPTY_HOSTEL = { name: '', warden_name: '', warden_contact: '', hostel_contact: '' };

const errorText = (e, fallback) => e.response?.data?.error || fallback;

const StatusBadge = ({ status }) => (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
        status === 'Allotted'
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    }`}>
        {status}
    </span>
);

const StudentPicker = ({ selected, onSelect, onClear }) => {
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (selected) return undefined;
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get('/hostel/unallotted-students', { params: { q } });
                if (!cancelled) setResults(res.data || []);
            } catch (e) {
                if (!cancelled) setError(errorText(e, 'Could not load students.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [q, selected]);

    if (selected) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 px-4 py-3">
                <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{selected.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selected.enrollment_number}{selected.course_name ? ` • ${selected.course_name}` : ''}{selected.semester ? ` • Sem ${selected.semester}` : ''}
                    </p>
                </div>
                {onClear && (
                    <button type="button" onClick={onClear} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Choose a different student">
                        <X size={18} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div>
            <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name, enrollment or roll number..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none"
                />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {loading && <p className="p-3 text-sm text-slate-400">Searching...</p>}
                {!loading && error && <p className="p-3 text-sm text-rose-600 dark:text-rose-400 font-semibold">{error}</p>}
                {!loading && !error && results.length === 0 && (
                    <p className="p-3 text-sm text-slate-400">No active students without a hostel match your search.</p>
                )}
                {!loading && !error && results.map((s) => (
                    <button
                        type="button"
                        key={s.student_id}
                        onClick={() => onSelect(s)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{s.full_name}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {s.enrollment_number}{s.course_name ? ` • ${s.course_name}` : ''}{s.semester ? ` • Sem ${s.semester}` : ''}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const AdminHostel = () => {
    const [tab, setTab] = useState('allotments');

    const [hostels, setHostels] = useState([]);
    const [hostelsError, setHostelsError] = useState('');
    const [allocations, setAllocations] = useState([]);
    const [allocLoading, setAllocLoading] = useState(true);
    const [allocError, setAllocError] = useState('');

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [hostelFilter, setHostelFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('Allotted');

    const [allocModal, setAllocModal] = useState(false);
    const [editingAllocId, setEditingAllocId] = useState(null);
    const [allocForm, setAllocForm] = useState(EMPTY_ALLOCATION);
    const [pickedStudent, setPickedStudent] = useState(null);
    const [allocError2, setAllocError2] = useState('');
    const [saving, setSaving] = useState(false);

    const [hostelModal, setHostelModal] = useState(false);
    const [editingHostelId, setEditingHostelId] = useState(null);
    const [hostelForm, setHostelForm] = useState(EMPTY_HOSTEL);
    const [hostelFormError, setHostelFormError] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const [reloadKey, setReloadKey] = useState(0);
    const refreshAll = () => setReloadKey((k) => k + 1);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                const res = await api.get('/hostels');
                if (cancelled) return;
                setHostels(res.data || []);
                setHostelsError('');
            } catch (e) {
                if (!cancelled) setHostelsError(errorText(e, 'Could not load hostels.'));
            }
        };
        run();
        return () => { cancelled = true; };
    }, [reloadKey]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setAllocLoading(true);
            try {
                const params = { status: statusFilter };
                if (hostelFilter) params.hostel_id = hostelFilter;
                if (debouncedSearch) params.q = debouncedSearch;
                const res = await api.get('/hostel-allocations', { params });
                if (cancelled) return;
                setAllocations(res.data || []);
                setAllocError('');
            } catch (e) {
                if (!cancelled) setAllocError(errorText(e, 'Could not load allotments.'));
            } finally {
                if (!cancelled) setAllocLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [statusFilter, hostelFilter, debouncedSearch, reloadKey]);


    const openAllot = () => {
        if (hostels.length === 0) {
            toast.error('Add a hostel first (Hostels tab).');
            return;
        }
        setEditingAllocId(null);
        setPickedStudent(null);
        setAllocForm({ ...EMPTY_ALLOCATION, academic_session: defaultSession() });
        setAllocError2('');
        setAllocModal(true);
    };

    const openEditAllocation = (a) => {
        setEditingAllocId(a.id);
        setPickedStudent({ full_name: a.student_name, enrollment_number: a.enrollment_number, course_name: a.course_name, semester: a.current_semester });
        setAllocForm({
            student_id: a.student_id,
            hostel_id: a.hostel_id,
            block: a.block || '',
            room_number: a.room_number,
            academic_session: a.academic_session,
            semester: a.semester ?? '',
            remarks: a.remarks || ''
        });
        setAllocError2('');
        setAllocModal(true);
    };

    const pickStudent = (s) => {
        setPickedStudent(s);
        setAllocForm((f) => ({ ...f, student_id: s.student_id, semester: s.semester ?? '' }));
    };

    const clearStudent = () => {
        setPickedStudent(null);
        setAllocForm((f) => ({ ...f, student_id: '', semester: '' }));
    };

    const submitAllocation = async (e) => {
        e.preventDefault();
        setAllocError2('');
        if (!editingAllocId && !allocForm.student_id) {
            setAllocError2('Please select a student.');
            return;
        }
        setSaving(true);
        try {
            if (editingAllocId) await api.put(`/hostel-allocations/${editingAllocId}`, allocForm);
            else await api.post('/hostel-allocations', allocForm);
            toast.success(editingAllocId ? 'Allotment updated.' : 'Hostel allotted.');
            setAllocModal(false);
            refreshAll();
        } catch (err) {
            setAllocError2(errorText(err, 'Could not save the allotment.'));
        } finally {
            setSaving(false);
        }
    };

    const vacate = async (a) => {
        if (!window.confirm(`Vacate ${a.student_name} from ${a.hostel_name}, room ${a.room_number}? The record is kept as history.`)) return;
        try {
            await api.post(`/hostel-allocations/${a.id}/vacate`);
            toast.success('Room vacated.');
            refreshAll();
        } catch (err) {
            toast.error(errorText(err, 'Could not vacate the room.'));
        }
    };

    const removeAllocation = async (a) => {
        if (!window.confirm(`Permanently delete this allotment record for ${a.student_name}? Use "Vacate" instead to keep history.`)) return;
        try {
            await api.delete(`/hostel-allocations/${a.id}`);
            toast.success('Allotment record deleted.');
            refreshAll();
        } catch (err) {
            toast.error(errorText(err, 'Could not delete the record.'));
        }
    };


    const openAddHostel = () => {
        setEditingHostelId(null);
        setHostelForm(EMPTY_HOSTEL);
        setHostelFormError('');
        setHostelModal(true);
    };

    const openEditHostel = (h) => {
        setEditingHostelId(h.id);
        setHostelForm({
            name: h.name,
            warden_name: h.warden_name || '',
            warden_contact: h.warden_contact || '',
            hostel_contact: h.hostel_contact || ''
        });
        setHostelFormError('');
        setHostelModal(true);
    };

    const submitHostel = async (e) => {
        e.preventDefault();
        setHostelFormError('');
        setSaving(true);
        try {
            if (editingHostelId) await api.put(`/hostels/${editingHostelId}`, hostelForm);
            else await api.post('/hostels', hostelForm);
            toast.success(editingHostelId ? 'Hostel updated.' : 'Hostel added.');
            setHostelModal(false);
            refreshAll();
        } catch (err) {
            setHostelFormError(errorText(err, 'Could not save the hostel.'));
        } finally {
            setSaving(false);
        }
    };

    const removeHostel = async (h) => {
        if (!window.confirm(`Delete the hostel "${h.name}"?`)) return;
        try {
            await api.delete(`/hostels/${h.id}`);
            toast.success('Hostel deleted.');
            refreshAll();
        } catch (err) {
            toast.error(errorText(err, 'Could not delete the hostel.'));
        }
    };


    const allotmentColumns = [
        {
            header: 'Student',
            accessor: 'student_name',
            cell: (r) => (
                <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{r.student_name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                        {r.enrollment_number}{r.course_name ? ` • ${r.course_name}` : ''}
                    </div>
                </div>
            )
        },
        {
            header: 'Hostel',
            accessor: 'hostel_name',
            cell: (r) => (
                <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{r.hostel_name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{r.block ? `Block ${r.block}` : 'No block'}</div>
                </div>
            )
        },
        { header: 'Room', accessor: 'room_number', cell: (r) => <span className="font-bold">{r.room_number}</span> },
        {
            header: 'Session',
            accessor: 'academic_session',
            cell: (r) => (
                <div>
                    <div className="font-semibold">{r.academic_session}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{r.semester ? `Sem ${r.semester}` : '—'}</div>
                </div>
            )
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (r) => (
                <div className="space-y-1">
                    <StatusBadge status={r.status} />
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {r.status === 'Vacated' ? `Vacated ${r.vacated_on}` : `Since ${r.allotted_on}`}
                    </div>
                </div>
            )
        },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (r) => (
                <div className="flex justify-end gap-1">
                    {r.status === 'Allotted' && (
                        <>
                            <button onClick={() => openEditAllocation(r)} title="Edit or transfer" className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"><Edit2 size={16} /></button>
                            <button onClick={() => vacate(r)} title="Vacate" className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg"><LogOut size={16} /></button>
                        </>
                    )}
                    <button onClick={() => removeAllocation(r)} title="Delete record" className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"><Trash2 size={16} /></button>
                </div>
            )
        }
    ];

    const hostelColumns = [
        { header: 'Hostel', accessor: 'name', cell: (r) => <span className="font-bold text-slate-900 dark:text-slate-100">{r.name}</span> },
        { header: 'Warden', accessor: 'warden_name', cell: (r) => r.warden_name || <span className="text-slate-400">—</span> },
        {
            header: 'Contacts',
            accessor: 'warden_contact',
            cell: (r) => (
                <div className="text-xs space-y-0.5">
                    <div><span className="text-slate-400">Warden:</span> {r.warden_contact || '—'}</div>
                    <div><span className="text-slate-400">Hostel:</span> {r.hostel_contact || '—'}</div>
                </div>
            )
        },
        { header: 'Residents', accessor: 'occupants', cell: (r) => <span className="font-bold">{r.occupants}</span> },
        {
            header: 'Actions',
            accessor: 'id',
            cell: (r) => (
                <div className="flex justify-end gap-1">
                    <button onClick={() => openEditHostel(r)} title="Edit" className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => removeHostel(r)} title="Delete" className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"><Trash2 size={16} /></button>
                </div>
            )
        }
    ];

    const totalResidents = hostels.reduce((sum, h) => sum + (h.occupants || 0), 0);

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Hostel Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage hostels and allot rooms. Students and parents see the allotment on their Hostel page.</p>
                </div>
                {tab === 'allotments' ? (
                    <button onClick={openAllot} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-md self-start md:self-auto">
                        <Plus size={18} /> Allot Hostel
                    </button>
                ) : (
                    <button onClick={openAddHostel} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-md self-start md:self-auto">
                        <Plus size={18} /> Add Hostel
                    </button>
                )}
            </header>

            <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hostels</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{hostels.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current residents</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalResidents}</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                {[['allotments', 'Allotments'], ['hostels', 'Hostels']].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`px-5 py-2 rounded-2xl text-sm font-bold border transition-colors ${
                            tab === key
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {hostelsError && (
                <div className="mb-6 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold text-sm">
                    {hostelsError}
                </div>
            )}

            {tab === 'allotments' && (
                <>
                    <div className="flex flex-col md:flex-row gap-3 mb-6">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search student name, enrollment, roll number or room..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none shadow-sm"
                            />
                        </div>
                        <select value={hostelFilter} onChange={(e) => setHostelFilter(e.target.value)} className={filterCls}>
                            <option value="">All hostels</option>
                            {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterCls}>
                            <option value="Allotted">Currently allotted</option>
                            <option value="Vacated">Vacated (history)</option>
                            <option value="all">All records</option>
                        </select>
                    </div>

                    {allocError ? (
                        <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold">
                            {allocError}
                        </div>
                    ) : allocLoading && allocations.length === 0 ? (
                        <div className="p-10 text-center font-semibold text-slate-400 dark:text-slate-500">Loading allotments...</div>
                    ) : (
                        <Table columns={allotmentColumns} data={allocations} pageSize={10} />
                    )}
                </>
            )}

            {tab === 'hostels' && <Table columns={hostelColumns} data={hostels} pageSize={10} />}

            <Modal isOpen={allocModal} onClose={() => setAllocModal(false)} title={editingAllocId ? 'Edit Allotment' : 'Allot Hostel'}>
                <form onSubmit={submitAllocation} className="space-y-5">
                    <div className="space-y-1">
                        <label className={labelCls}>Student <span className="text-rose-500">*</span></label>
                        <StudentPicker selected={pickedStudent} onSelect={pickStudent} onClear={editingAllocId ? null : clearStudent} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelCls}>Hostel <span className="text-rose-500">*</span></label>
                            <select required value={allocForm.hostel_id} onChange={(e) => setAllocForm({ ...allocForm, hostel_id: e.target.value })} className={selectCls}>
                                <option value="">Select hostel</option>
                                {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>
                        <Input label="Block" value={allocForm.block} onChange={(e) => setAllocForm({ ...allocForm, block: e.target.value })} placeholder="e.g. A" />
                        <Input label="Room number" value={allocForm.room_number} onChange={(e) => setAllocForm({ ...allocForm, room_number: e.target.value })} placeholder="e.g. 204" required />
                        <Input label="Session" value={allocForm.academic_session} onChange={(e) => setAllocForm({ ...allocForm, academic_session: e.target.value })} placeholder="2026-2027" required />
                        <Input label="Semester" type="number" value={allocForm.semester} onChange={(e) => setAllocForm({ ...allocForm, semester: e.target.value })} placeholder="1 to 12" />
                        <Input label="Remarks" value={allocForm.remarks} onChange={(e) => setAllocForm({ ...allocForm, remarks: e.target.value })} placeholder="Optional" />
                    </div>

                    {allocError2 && (
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400" role="alert">{allocError2}</p>
                    )}

                    <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                        <Building2 size={18} />
                        {saving ? 'Saving...' : editingAllocId ? 'Update Allotment' : 'Allot Room'}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={hostelModal} onClose={() => setHostelModal(false)} title={editingHostelId ? 'Edit Hostel' : 'Add Hostel'}>
                <form onSubmit={submitHostel} className="space-y-5">
                    <Input label="Hostel name" value={hostelForm.name} onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })} placeholder="e.g. Ambedkar Boys Hostel" required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Warden name" value={hostelForm.warden_name} onChange={(e) => setHostelForm({ ...hostelForm, warden_name: e.target.value })} />
                        <Input label="Warden contact" value={hostelForm.warden_contact} onChange={(e) => setHostelForm({ ...hostelForm, warden_contact: e.target.value })} placeholder="Phone number" />
                    </div>
                    <Input label="Hostel contact" value={hostelForm.hostel_contact} onChange={(e) => setHostelForm({ ...hostelForm, hostel_contact: e.target.value })} placeholder="Hostel office phone number" />

                    {hostelFormError && (
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400" role="alert">{hostelFormError}</p>
                    )}

                    <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl shadow-lg">
                        {saving ? 'Saving...' : editingHostelId ? 'Update Hostel' : 'Add Hostel'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminHostel;
