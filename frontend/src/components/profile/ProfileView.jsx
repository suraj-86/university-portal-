import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import Modal from '../Modal';
import { FieldLabel, FormError, ModalActions, modalSelectCls } from '../admin/ListParts';

const EMPTY_VALUES = new Set(['', 'n/a', 'not available', 'not available in db', 'null', 'undefined']);
const clean = (v) => {
    const s = v === null || v === undefined ? '' : String(v).trim();
    return EMPTY_VALUES.has(s.toLowerCase()) ? '' : s;
};
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500';

const Fact = ({ label, value, tone }) => (
    <div>
        <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</dt>
        <dd className={`text-sm font-medium break-words ${value ? (tone === 'rose' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100') : 'text-slate-400 dark:text-slate-500'}`}>{value || 'Not provided'}</dd>
    </div>
);

const Section = ({ title, hint, action, children }) => (
    <section aria-label={title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 md:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-5">
            <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</h2>
                {hint && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
            </div>
            {action}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">{children}</dl>
    </section>
);

// Student profile page body. `data` is the /student/:id/profile response.
// canEdit + onSave(payload) -> Promise: show the Edit button (students only; parents view their ward).
const ProfileView = ({ data, title, subtitle, canEdit = false, onSave, switcher = null }) => {
    const { personal, academic, guardians } = data;
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const address = [clean(personal.address), clean(personal.city), clean(personal.state)].filter(Boolean).join(', ')
        + (clean(personal.pin_code) ? ` - ${clean(personal.pin_code)}` : '');
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const openEdit = () => {
        setForm({
            contact: clean(personal.contact), blood_group: clean(personal.blood_group), address: clean(personal.address), city: clean(personal.city),
            state: clean(personal.state), pin_code: clean(personal.pin_code), father_name: clean(guardians.father_name),
            guardian_relation: clean(guardians.guardian_relation), emergency_contact: clean(guardians.emergency_contact)
        });
        setError(''); setOpen(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!/^[0-9+\-\s]{7,15}$/.test(form.contact.trim())) return setError('Enter a valid contact number (digits only, 7 to 15 characters).');
        if (form.emergency_contact && !/^[0-9+\-\s]{7,15}$/.test(form.emergency_contact.trim())) return setError('Enter a valid emergency contact number.');
        if (form.pin_code && !/^\d{6}$/.test(form.pin_code.trim())) return setError('PIN code must be 6 digits.');
        setBusy(true); setError('');
        try {
            await onSave({ ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) });
            setOpen(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not save your changes.');
        } finally { setBusy(false); }
    };

    const initial = (personal.name || '?').trim().charAt(0).toUpperCase();

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">
            {switcher}
            <header className="mb-6">
                <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
            </header>

            <div className="mb-6 flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
                {personal.profile_picture && /^https?:\/\//.test(personal.profile_picture) ? (
                    <img src={personal.profile_picture} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
                ) : (
                    <span aria-hidden="true" className="w-14 h-14 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-black">{initial}</span>
                )}
                <div className="min-w-0 flex-1">
                    <p className="text-xl font-black text-slate-900 dark:text-slate-100 truncate">{personal.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{[academic.course, academic.semester].filter(Boolean).join(' · ')}</p>
                </div>
                <dl className="flex gap-6 text-sm">
                    <div><dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Roll no.</dt><dd className="font-bold text-slate-900 dark:text-slate-100">{clean(academic.roll_no) || 'Not assigned'}</dd></div>
                    <div><dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Enrollment no.</dt><dd className="font-bold text-slate-900 dark:text-slate-100">{clean(academic.enrollment_no) || '-'}</dd></div>
                </dl>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Section title="Contact and personal" hint="How the university reaches you."
                    action={canEdit && <button type="button" onClick={openEdit} className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl px-4 py-2"><Pencil size={14} aria-hidden="true" /> Edit</button>}>
                    <Fact label="Email" value={clean(personal.email)} />
                    <Fact label="Phone" value={clean(personal.contact)} />
                    <Fact label="Date of birth" value={clean(personal.dob)} />
                    <Fact label="Blood group" value={clean(personal.blood_group)} />
                    <div className="sm:col-span-2"><Fact label="Address" value={address} /></div>
                </Section>

                <Section title="Guardian" hint="Who we contact in an emergency.">
                    <Fact label="Guardian's name" value={clean(guardians.father_name)} />
                    <Fact label="Relation" value={clean(guardians.guardian_relation)} />
                    <Fact label="Emergency contact" value={clean(guardians.emergency_contact)} tone="rose" />
                </Section>
            </div>

            {canEdit && (
                <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit your details">
                    <form onSubmit={submit} className="space-y-4">
                        <FormError message={error} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><FieldLabel htmlFor="pf-contact">Contact number</FieldLabel><input id="pf-contact" inputMode="tel" required value={form.contact || ''} onChange={set('contact')} className={inputCls} /></div>
                            <div>
                                <FieldLabel htmlFor="pf-blood">Blood group</FieldLabel>
                                <select id="pf-blood" value={form.blood_group || ''} onChange={set('blood_group')} className={modalSelectCls}>
                                    <option value="">Not provided</option>
                                    {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2"><FieldLabel htmlFor="pf-address">Address</FieldLabel><input id="pf-address" value={form.address || ''} onChange={set('address')} className={inputCls} /></div>
                            <div><FieldLabel htmlFor="pf-city">City</FieldLabel><input id="pf-city" value={form.city || ''} onChange={set('city')} className={inputCls} /></div>
                            <div><FieldLabel htmlFor="pf-state">State</FieldLabel><input id="pf-state" value={form.state || ''} onChange={set('state')} className={inputCls} /></div>
                            <div><FieldLabel htmlFor="pf-pin">PIN code</FieldLabel><input id="pf-pin" inputMode="numeric" maxLength={6} value={form.pin_code || ''} onChange={set('pin_code')} className={inputCls} /></div>
                            <div><FieldLabel htmlFor="pf-gname">Guardian's name</FieldLabel><input id="pf-gname" value={form.father_name || ''} onChange={set('father_name')} className={inputCls} /></div>
                            <div><FieldLabel htmlFor="pf-grel">Guardian relation</FieldLabel><input id="pf-grel" value={form.guardian_relation || ''} onChange={set('guardian_relation')} className={inputCls} /></div>
                            <div><FieldLabel htmlFor="pf-emerg">Emergency contact</FieldLabel><input id="pf-emerg" inputMode="tel" value={form.emergency_contact || ''} onChange={set('emergency_contact')} className={inputCls} /></div>
                        </div>
                        <ModalActions onCancel={() => setOpen(false)} busy={busy} submitLabel="Save changes" />
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default ProfileView;
