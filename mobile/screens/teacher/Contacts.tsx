import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { Card, EmptyState, Gate, Screen, SelectField, T, useLoad } from '@/components/ui';
import { Avatar, ContactLinks, SearchBox } from '../shared/sharedBits';

type Parent = { name: string; phone?: string | null; email?: string | null };
type Student = {
  student_id: number; name: string; roll_number?: string | null; enrollment_number?: string | null; course_id: number; course_code: string; course_name: string;
  semester: number; phone?: string | null; email?: string | null; guardian_name?: string | null; guardian_phone?: string | null; guardian_relation?: string | null; parents: Parent[];
};

const ALL = 'all';
const classKey = (s: Student) => `${s.course_id}-${s.semester}`;
const digits = (v: any) => String(v || '').replace(/\D/g, '');

function Who({ icon, label, name }: { icon: keyof typeof Ionicons.glyphMap; label: string; name: string }) {
  const { c } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={14} color={c.muted} />
      <T v="small" style={{ flex: 1 }}>{label}: <T v="small" style={{ color: c.text, fontWeight: '700' }}>{name}</T></T>
    </View>
  );
}

function Directory({ students, refreshKey }: { students: Student[]; refreshKey: number }) {
  const [picked, setPicked] = useState('');
  const [query, setQuery] = useState('');

  const classes = useMemo(() => {
    const map = new Map<string, { key: string; course_code: string; course_name: string; semester: number; count: number }>();
    students.forEach((s) => {
      const k = classKey(s);
      const rec = map.get(k) || { key: k, course_code: s.course_code, course_name: s.course_name, semester: s.semester, count: 0 };
      rec.count += 1; map.set(k, rec);
    });
    return [...map.values()].sort((a, b) => String(a.course_code).localeCompare(String(b.course_code)) || a.semester - b.semester);
  }, [students, refreshKey]);

  const selected = picked && (picked === ALL || classes.some((k) => k.key === picked)) ? picked : (classes[0] ? classes[0].key : ALL);
  const current = classes.find((k) => k.key === selected);
  const q = query.trim().toLowerCase();
  const shown = students.filter((s) => {
    if (selected !== ALL && classKey(s) !== selected) return false;
    if (!q) return true;
    return [s.name, s.roll_number, s.enrollment_number, s.guardian_name, ...s.parents.map((p) => p.name)].some((v) => v && String(v).toLowerCase().includes(q));
  });

  if (students.length === 0) return <Card><EmptyState text="No students are linked to your assigned subjects yet." icon="people-outline" /></Card>;

  return (
    <>
      <SelectField label="Class" value={selected} onChange={(v) => setPicked(String(v))}
        options={[...classes.map((k) => ({ value: k.key, label: `${k.course_code} · Semester ${k.semester} (${k.count})` })), ...(classes.length > 1 ? [{ value: ALL, label: `All my classes (${students.length})` }] : [])]} />
      <SearchBox value={query} onChange={setQuery} placeholder="Student name, roll number or parent name" />
      <T v="small">
        {current ? `${current.course_name} · Semester ${current.semester} · ` : 'All classes · '}showing {shown.length} of {current ? current.count : students.length} students
      </T>

      {shown.length === 0 ? (
        <Card><EmptyState text={`No students match "${query}".${classes.length > 1 && selected !== ALL ? ' Try "All my classes".' : ''}`} icon="search-outline" /></Card>
      ) : shown.map((s) => {
        const parentPhones = s.parents.map((p) => digits(p.phone));
        const showGuardian = (s.guardian_name || s.guardian_phone) && !(s.guardian_phone && parentPhones.includes(digits(s.guardian_phone)));
        return (
          <Card key={s.student_id}>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={s.name} size={40} />
                <View style={{ flex: 1 }}>
                  <T v="h2" numberOfLines={1}>{s.name}</T>
                  <T v="small">{[s.roll_number && `Roll ${s.roll_number}`, s.course_code, `Sem ${s.semester}`].filter(Boolean).join(' · ')}</T>
                </View>
              </View>
              <ContactLinks phone={s.phone} whatsapp={s.phone} email={s.email} />
              {s.parents.map((p, i) => (
                <View key={`${p.name}-${i}`} style={{ gap: 6 }}>
                  <Who icon="person-outline" label="Parent" name={p.name} />
                  <ContactLinks phone={p.phone} whatsapp={p.phone} email={p.email} />
                </View>
              ))}
              {showGuardian ? (
                <View style={{ gap: 6 }}>
                  <Who icon="person-outline" label="Guardian" name={`${s.guardian_name || 'On file'}${s.guardian_relation ? ` (${s.guardian_relation})` : ''}`} />
                  <ContactLinks phone={s.guardian_phone} whatsapp={s.guardian_phone} />
                </View>
              ) : null}
              {s.parents.length === 0 && !showGuardian ? <T v="small">No parent or guardian contact on file</T> : null}
            </View>
          </Card>
        );
      })}
    </>
  );
}

// Students in the teacher's classes with their parents' contact details.
export default function Contacts() {
  const load = useLoad(['/teacher/contacts']);
  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      <T v="muted">Only students in the courses and semesters you teach. Please use these details for academic purposes only.</T>
      <Gate load={load} cards={4}>{(d) => <Directory students={(d[0]?.students as Student[]) || []} refreshKey={0} />}</Gate>
    </Screen>
  );
}
