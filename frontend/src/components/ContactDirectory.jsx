import React from 'react';
import { MapPin, Clock, Building, GraduationCap, EyeOff } from 'lucide-react';
import ContactLinks from './ContactLinks';
import { OFFICE_GROUPS } from '../utils/contactGroups';


const byOrder = (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

const Row = ({ c, actions, showAudience }) => (
    <li className={`py-3 first:pt-0 last:pb-0 ${c.is_visible ? '' : 'opacity-70'}`}>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="font-black text-slate-900 dark:text-slate-100 leading-tight">
                    {c.name}
                    {c.scope === 'course' && (
                        <span className="ml-2 align-middle rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-bold">{c.course_code}</span>
                    )}
                </p>
                {c.designation && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.designation}</p>}
            </div>
            {actions && <div className="flex gap-1 shrink-0">{actions(c)}</div>}
        </div>
        <div className="mt-2"><ContactLinks phone={c.phone} whatsapp={c.whatsapp} email={c.email} /></div>
        {(c.location || c.office_hours || showAudience || !c.is_visible) && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {c.location && <li className="flex items-center gap-1.5"><MapPin size={13} className="shrink-0" /> {c.location}</li>}
                {c.office_hours && <li className="flex items-center gap-1.5"><Clock size={13} className="shrink-0" /> {c.office_hours}</li>}
                {showAudience && <li>Shown to: {{ all: 'Everyone', student: 'Students only', parent: 'Parents only', teacher: 'Teachers only' }[c.audience] || c.audience}</li>}
                {!c.is_visible && <li className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400"><EyeOff size={12} /> Hidden</li>}
            </ul>
        )}
    </li>
);

const GroupCard = ({ title, subtitle, icon, tone, contacts, actions, showAudience }) => (
    <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
            <div className="min-w-0">
                <h4 className="font-black text-slate-900 dark:text-slate-100 leading-tight">{title}</h4>
                {subtitle && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {contacts.map((c) => <Row key={c.id} c={c} actions={actions} showAudience={showAudience} />)}
        </ul>
    </article>
);

const sectionTitle = 'text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-3';

const ContactDirectory = ({ contacts, actions, showAudience = false }) => {
    const offices = contacts.filter((c) => c.scope === 'university');
    const scoped = contacts.filter((c) => c.scope !== 'university');

    const officeGroups = [...new Set(offices.map((c) => c.category))]
        .sort((a, b) => {
            const ia = OFFICE_GROUPS.indexOf(a); const ib = OFFICE_GROUPS.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
        })
        .map((cat) => ({ cat, items: offices.filter((c) => c.category === cat).sort(byOrder) }));

    const departments = [...new Set(scoped.map((c) => c.department || 'Other'))]
        .sort((a, b) => a.localeCompare(b))
        .map((dept) => ({
            dept,
            items: scoped.filter((c) => (c.department || 'Other') === dept)
                .sort((a, b) => (a.scope === b.scope ? byOrder(a, b) : (a.scope === 'department' ? -1 : 1)))
        }));

    return (
        <>
            {officeGroups.length > 0 && (
                <section className="mb-10">
                    <h3 className={sectionTitle}>University offices</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        {officeGroups.map((g) => (
                            <GroupCard key={g.cat} title={g.cat} icon={<Building size={18} />}
                                tone="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                                contacts={g.items} actions={actions} showAudience={showAudience} />
                        ))}
                    </div>
                </section>
            )}
            {departments.length > 0 && (
                <section className="mb-10">
                    <h3 className={sectionTitle}>Departments</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        {departments.map((g) => (
                            <GroupCard key={g.dept} title={g.dept}
                                subtitle={[...new Set(g.items.filter((c) => c.course_code).map((c) => c.course_code))].join(' · ') || null}
                                icon={<GraduationCap size={18} />}
                                tone="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                                contacts={g.items} actions={actions} showAudience={showAudience} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
};

export default ContactDirectory;
