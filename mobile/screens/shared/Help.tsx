import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Badge, Card, EmptyState, Gate, Notice, Screen, T, useLoad } from '@/components/ui';
import { ContactLinks, SearchBox } from './sharedBits';

type Contact = {
  id: number; scope: 'university' | 'department' | 'course'; category: string; department: string | null; course_code: string | null; course_name: string | null;
  name: string; designation: string | null; phone: string | null; whatsapp: string | null; email: string | null; location: string | null; office_hours: string | null;
  sort_order: number;
};
type WardTeachers = { ward: string; course_code: string; semester: number; teachers: { teacher_id: number; name: string; designation: string; department: string; email: string; subjects: { code: string; name: string }[] }[] };

const OFFICE_GROUPS = ['Leadership', 'Administration', 'Academic', 'Admission', 'Examination', 'Student Welfare', 'Hostel & Mess', 'Technical', 'Other'];
const byOrder = (a: Contact, b: Contact) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

function ContactCard({ title, subtitle, icon, items }: { title: string; subtitle?: string | null; icon: keyof typeof Ionicons.glyphMap; items: Contact[] }) {
  const { c } = useAppTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={20} color={c.accent} /></View>
        <View style={{ flex: 1 }}>
          <T v="h2">{title}</T>
          {subtitle ? <T v="small">{subtitle}</T> : null}
        </View>
      </View>
      {items.map((p, i) => (
        <View key={p.id} style={{ paddingVertical: 12, gap: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <T v="body" style={{ fontWeight: '700' }}>{p.name}</T>
              {p.scope === 'course' && p.course_code ? <Badge label={p.course_code} tone="info" /> : null}
            </View>
            {p.designation ? <T v="small">{p.designation}</T> : null}
          </View>
          <ContactLinks phone={p.phone} whatsapp={p.whatsapp} email={p.email} />
          {p.location || p.office_hours ? <T v="small">{[p.location, p.office_hours].filter(Boolean).join(' · ')}</T> : null}
        </View>
      ))}
    </Card>
  );
}

export default function Help() {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const [query, setQuery] = useState('');
  const load = useLoad(isParent ? ['/university-contacts', '/parent/teachers'] : ['/university-contacts']);

  const contacts: Contact[] = (load.data?.[0] as Contact[]) || [];
  const wardTeachers: WardTeachers[] = (load.data?.[1] as WardTeachers[]) || [];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((x) => [x.name, x.designation, x.category, x.department, x.course_code, x.course_name, x.location, x.email, x.phone].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [contacts, query]);

  const offices = shown.filter((x) => x.scope === 'university');
  const scoped = shown.filter((x) => x.scope !== 'university');
  const officeGroups = [...new Set(offices.map((x) => x.category))]
    .sort((a, b) => { const ia = OFFICE_GROUPS.indexOf(a); const ib = OFFICE_GROUPS.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); })
    .map((cat) => ({ cat, items: offices.filter((x) => x.category === cat).sort(byOrder) }));
  const departments = [...new Set(scoped.map((x) => x.department || 'Other'))].sort((a, b) => a.localeCompare(b))
    .map((dept) => ({ dept, items: scoped.filter((x) => (x.department || 'Other') === dept).sort((a, b) => (a.scope === b.scope ? byOrder(a, b) : a.scope === 'department' ? -1 : 1)) }));

  const teachers = useMemo(() => {
    const map = new Map<number, any>();
    wardTeachers.forEach((w) => w.teachers.forEach((t) => {
      const rec = map.get(t.teacher_id) || { ...t, subjects: new Map<string, any>() };
      t.subjects.forEach((s) => {
        const e = rec.subjects.get(s.code) || { ...s, wards: [] as string[] };
        if (!e.wards.includes(w.ward)) e.wards.push(w.ward);
        rec.subjects.set(s.code, e);
      });
      map.set(t.teacher_id, rec);
    }));
    return [...map.values()].map((t) => ({ ...t, subjects: [...t.subjects.values()] })).sort((x: any, y: any) => x.name.localeCompare(y.name));
  }, [wardTeachers]);
  const wardNames = wardTeachers.map((w) => w.ward);
  const subjectLabel = (s: any) => (wardNames.length > 1 && s.wards.length < wardNames.length ? `${s.name} (${s.wards.join(', ')})` : s.name);

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      <Notice tone="info">Official university offices and how to reach them. There is no ticket system, so please use the contact details below.</Notice>
      <Gate load={load} cards={3}>
        {() => (
          <>
            <SearchBox value={query} onChange={setQuery} placeholder="Search offices, departments, people…" />
            {contacts.length === 0 ? <EmptyState text="No contact information has been added yet." icon="help-buoy-outline" /> : shown.length === 0 ? <EmptyState text={`No contacts match “${query}”.`} icon="search-outline" /> : (
              <>
                {officeGroups.length > 0 ? <T v="label">University offices</T> : null}
                {officeGroups.map((g) => <ContactCard key={g.cat} title={g.cat} icon="business-outline" items={g.items} />)}
                {departments.length > 0 ? <T v="label" style={{ marginTop: 6 }}>Departments</T> : null}
                {departments.map((g) => <ContactCard key={g.dept} title={g.dept} icon="school-outline" subtitle={[...new Set(g.items.filter((x) => x.course_code).map((x) => x.course_code))].join(' · ') || null} items={g.items} />)}
              </>
            )}

            {isParent ? (
              <>
                <T v="label" style={{ marginTop: 6 }}>{wardNames.length > 1 ? "Your wards' teachers" : "Your ward's teachers"}</T>
                {wardNames.length > 0 ? <T v="small">{wardTeachers.map((w) => `${w.ward} (${w.course_code}, Sem ${w.semester})`).join(' · ')}</T> : null}
                {wardNames.length === 0 ? <EmptyState text="No active wards are linked to your account." icon="people-outline" /> : teachers.length === 0 ? <EmptyState text="No teachers are assigned to your ward's semester yet." icon="school-outline" /> : teachers.map((t: any) => (
                  <Card key={t.teacher_id}>
                    <View style={{ gap: 6 }}>
                      <T v="h2">{t.name}</T>
                      <T v="small">{[t.designation, t.department].filter(Boolean).join(' · ')}</T>
                      <T v="small">Teaches: {t.subjects.map(subjectLabel).join(', ')}</T>
                      <ContactLinks email={t.email} />
                    </View>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
      </Gate>
    </Screen>
  );
}
