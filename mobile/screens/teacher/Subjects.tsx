import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, EmptyState, Field, Gate, LinkText, Notice, Screen, SelectField, Sheet, T, useLoad } from '@/components/ui';
import api, { errorMessage } from '@/services/api';
import { plural } from '@/lib/format';

const todayIso = () => new Date().toLocaleDateString('en-CA');
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
const pad = (t: string) => (t.length === 4 ? `0${t}` : t);

export default function TeacherSubjects() {
  const { c } = useAppTheme();
  const { user } = useAuth();
  const router = useRouter();
  const load = useLoad(user?.id ? [`/teacher/${user.id}/assigned-subjects`, `/teacher/${user.id}/insights`] : null);
  const [course, setCourse] = useState('');
  const [sem, setSem] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ date: '', start: '09:00', end: '10:00', room: '' });
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [saving, setSaving] = useState(false);

  const open = (s: any) => { setSelected(s); setForm({ date: todayIso(), start: '09:00', end: '10:00', room: '' }); setErr(''); };

  const submit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return setErr('Enter the date as YYYY-MM-DD.');
    if (!TIME_RE.test(form.start) || !TIME_RE.test(form.end)) return setErr('Enter times as 24-hour HH:MM, for example 14:30.');
    const start = pad(form.start); const end = pad(form.end);
    if (end <= start) return setErr('The class must end after it starts.');
    if (!form.room.trim()) return setErr('Enter a room or venue.');
    setSaving(true); setErr('');
    try {
      await api.post('/teacher/schedule-class', { userId: user!.id, subjectId: selected.id, date: form.date, startTime: start, endTime: end, room: form.room.trim() });
      setDone(`Scheduled ${selected.subject_name}.`);
      setSelected(null);
    } catch (e) {
      setErr(errorMessage(e, 'Could not schedule the class.'));
    } finally { setSaving(false); }
  };

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {done ? <Notice tone="success">{done}</Notice> : null}
      <Gate load={load} cards={3}>
        {([subjects, insights]) => {
          const list: any[] = subjects || [];
          const att = new Map<number, any>((insights?.analytics?.attendanceBySubject || []).map((a: any) => [a.subject_id, a.percent]));
          const marks = new Map<number, any>((insights?.analytics?.marksBySubject || []).map((m: any) => [m.subject_id, m]));
          const low = insights?.trend?.lowThreshold ?? 75;
          const courses = [...new Set(list.map((s) => s.course_name).filter(Boolean))].sort() as string[];
          const sems = [...new Set(list.map((s) => s.semester))].sort((a: any, b: any) => a - b);
          const term = search.trim().toLowerCase();
          const shown = list.filter((s) => (!course || s.course_name === course) && (!sem || String(s.semester) === sem)
            && (!term || [s.subject_name, s.subject_code, s.course_name].some((v) => (v || '').toLowerCase().includes(term))));
          const students = list.reduce((n, s) => n + (Number(s.enrolled_count) || 0), 0);

          return (
            <>
              <T v="muted">{plural(list.length, 'subject')} · {plural(students, 'student')} enrolled</T>
              {list.length > 0 && (
                <>
                  <Field label="Search" value={search} onChangeText={setSearch} placeholder="Subject, code or course" autoCapitalize="none" />
                  {courses.length > 1 && <SelectField label="Course" value={course} placeholder="All courses" options={[{ value: '', label: 'All courses' }, ...courses.map((x) => ({ value: x, label: x }))]} onChange={setCourse} />}
                  {sems.length > 1 && <SelectField label="Semester" value={sem} placeholder="All semesters" options={[{ value: '', label: 'All semesters' }, ...sems.map((n: any) => ({ value: String(n), label: `Semester ${n}` }))]} onChange={setSem} />}
                </>
              )}
              {shown.length === 0 ? <Card><EmptyState text={list.length ? 'No subject matches these filters.' : 'No subjects are assigned to you yet.'} icon="book-outline" /></Card> : shown.map((s) => {
                const a = att.get(s.id); const m = marks.get(s.id);
                const isLow = a !== undefined && a !== null && a < low;
                return (
                  <Card key={s.id}>
                    <View style={{ gap: 8 }}>
                      <T v="label">{s.subject_code}</T>
                      <T v="h2">{s.subject_name}</T>
                      <T v="muted">{s.course_name} · Semester {s.semester}</T>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="muted">Students enrolled</T><Text style={{ color: c.text, fontWeight: '700' }}>{s.enrolled_count}</Text></View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="muted">Average attendance</T><Text style={{ color: isLow ? c.warn : c.text, fontWeight: '700' }}>{a !== undefined && a !== null ? `${a}%` : '-'}</Text></View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="muted">Average marks</T><Text style={{ color: c.text, fontWeight: '700' }}>{m ? `${m.average}%` : '-'}</Text></View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                        <Button label="Schedule class" icon="calendar-outline" onPress={() => open(s)} />
                        <LinkText label="Attendance" onPress={() => router.navigate('/teacher/attendance' as any)} />
                        <LinkText label="Marks" onPress={() => router.navigate('/teacher/marks' as any)} />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </>
          );
        }}
      </Gate>

      <Sheet visible={!!selected} title={`Schedule class${selected ? ` · ${selected.subject_name}` : ''}`} onClose={() => setSelected(null)}>
        {err ? <Notice tone="danger">{err}</Notice> : null}
        <Field label="Date (YYYY-MM-DD)" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="2026-01-31" keyboardType="numbers-and-punctuation" />
        <Field label="Start time (24-hour)" value={form.start} onChangeText={(v) => setForm({ ...form, start: v })} placeholder="09:00" keyboardType="numbers-and-punctuation" />
        <Field label="End time (24-hour)" value={form.end} onChangeText={(v) => setForm({ ...form, end: v })} placeholder="10:00" keyboardType="numbers-and-punctuation" />
        <Field label="Room / Venue" value={form.room} onChangeText={(v) => setForm({ ...form, room: v })} placeholder="e.g. Lab 4" />
        <Button label="Confirm schedule" onPress={submit} loading={saving} />
      </Sheet>
    </Screen>
  );
}
