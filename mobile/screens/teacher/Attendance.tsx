import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { Text, TextInput } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { B, Button, Card, ChartCard, EmptyState, ErrorState, Gate, LinkText, LoadingBlock, Notice, Row, Screen, Segmented, SelectField, T, useLoad } from '@/components/ui';
import api, { errorMessage } from '@/services/api';
import { dateLabel, plural } from '@/lib/format';
import { AttendanceHistory, Status, Student, StatusChips, countBy, countsLine } from './attendanceBits';

const PAGE = 40;
// The tab bar floats ~72px over the bottom of the screen (plus the safe area).
const TAB_BAR = 72;
const BAR_H = 76;

type Subject = { id: number; subject_code: string; subject_name: string; course_name: string; semester: number };
type Sheet = { date: string; already_marked: boolean; students: Student[] };

function Marking({ teacherId: _t, subjects, subjectId, onSubject, onRefreshRef }: { teacherId: number; subjects: Subject[]; subjectId: string; onSubject: (id: string) => void; onRefreshRef: (fn: () => void) => void }) {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const load = useLoad(subjectId ? [`/attendance/sheet?subject_id=${subjectId}`] : null);
  const [roster, setRoster] = useState<Student[]>([]);
  const [original, setOriginal] = useState<Record<number, Status>>({});
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  onRefreshRef(load.refresh);

  const sheet: Sheet | null = load.data?.[0] && Array.isArray(load.data[0].students) ? load.data[0] : null;
  const lastData = useRef<unknown>(null);
  useEffect(() => {
    if (!sheet || lastData.current === load.data) return;
    lastData.current = load.data;
    const students = sheet.students.map((s) => ({ ...s, status: (s.status || 'Absent') as Status }));
    setRoster(students);
    setOriginal(Object.fromEntries(students.map((s) => [s.student_id, s.status])));
    setShown(PAGE);
  }, [sheet, load.data]);
  useEffect(() => { setResult(null); setQuery(''); lastData.current = null; setRoster([]); }, [subjectId]);

  const subject = subjects.find((s) => String(s.id) === subjectId);
  const counts = useMemo(() => countBy(roster), [roster]);
  const changed = roster.filter((s) => original[s.student_id] !== s.status).length;
  const q = query.trim().toLowerCase();
  const list = roster.filter((s) => !q || String(s.name || '').toLowerCase().includes(q) || String(s.roll ?? '').toLowerCase().includes(q));

  const set = (id: number, status: Status) => { setResult(null); setRoster((r) => r.map((s) => (s.student_id === id ? { ...s, status } : s))); };
  const all = (status: Status) => { setResult(null); setRoster((r) => r.map((s) => ({ ...s, status }))); };

  const save = async () => {
    if (!sheet || roster.length === 0) return;
    setSaving(true);
    try {
      const res = await api.post('/attendance', { subject_id: Number(subjectId), date: sheet.date, students: roster.map((s) => ({ student_id: s.student_id, status: s.status })) });
      setResult({ ok: true, text: res.data?.message || `Attendance for ${dateLabel(sheet.date)} has been saved.` });
      load.reload();
    } catch (e) {
      setResult({ ok: false, text: errorMessage(e, 'Failed to save attendance.') });
    } finally { setSaving(false); }
  };

  const confirm = () => {
    if (!sheet) return;
    const warn = counts.Present === 0 ? '\n\nEveryone is marked absent.' : '';
    Alert.alert(
      sheet.already_marked ? 'Update attendance?' : 'Save attendance?',
      `${subject?.subject_name || 'Class'} · ${dateLabel(sheet.date)}\n${countsLine(counts)}${sheet.already_marked ? `\n${plural(changed, 'change')} from the saved sheet.` : ''}${warn}`,
      [{ text: 'Cancel', style: 'cancel' }, { text: sheet.already_marked ? 'Update' : 'Save', onPress: save }],
    );
  };

  const empty = !!sheet && roster.length === 0 && sheet.students.length === 0;

  return (
    <>
      <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
        <Card>
          <View style={{ gap: 12 }}>
            <SelectField label="Subject" value={subjectId} options={subjects.map((s) => ({ value: String(s.id), label: `${s.subject_code} - ${s.subject_name} (Sem ${s.semester})` }))} onChange={(v) => onSubject(String(v))} />
            {subject ? <T v="small">{subject.course_name} · Semester {subject.semester}</T> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={18} color={c.accent} />
              <T v="body" style={{ fontWeight: '700' }}>Today{sheet ? ` · ${dateLabel(sheet.date)}` : ''}</T>
            </View>
            <T v="small">Attendance can only be marked or edited on the day of the class.</T>
          </View>
        </Card>

        {load.loading && !sheet ? <LoadingBlock cards={3} /> : load.error && !sheet ? <ErrorState message={load.error} onRetry={load.reload} /> : empty ? (
          <EmptyState text="No students are enrolled in this subject's course and semester." icon="people-outline" />
        ) : sheet ? (
          <>
            {result ? <Notice tone={result.ok ? 'success' : 'danger'}>{result.text}</Notice> : null}
            {sheet.already_marked ? <Notice tone="info">Attendance for today is already saved. You can edit it until the end of the day; changes are recorded.</Notice> : null}

            <Card>
              <View style={{ gap: 10 }}>
                <T v="body"><B>{roster.length}</B> students · {countsLine(counts)}</T>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Button label="All Present" variant="soft" icon="checkmark-done-outline" onPress={() => all('Present')} /></View>
                  <View style={{ flex: 1 }}><Button label="All Absent" variant="danger" icon="close-circle-outline" onPress={() => all('Absent')} /></View>
                </View>
                <T v="small">P Present · A Absent · L Late · E Excused. Only Present counts towards a student's attendance.</T>
              </View>
            </Card>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12 }}>
              <Ionicons name="search" size={16} color={c.faint} />
              <TextInput value={query} onChangeText={(v) => { setQuery(v); setShown(PAGE); }} placeholder="Search by name or roll number…" placeholderTextColor={c.faint} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search students"
                style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: c.text }} />
            </View>

            <Card pad={false} style={{ paddingHorizontal: 14 }}>
              {list.length === 0 ? <View style={{ padding: 16 }}><EmptyState text="No students match your search." icon="search-outline" /></View> : list.slice(0, shown).map((s, i) => (
                <Row key={s.student_id} last={i === Math.min(shown, list.length) - 1} title={s.name || 'Student'} subtitle={s.roll ? `Roll ${s.roll}` : undefined}
                  right={<StatusChips value={s.status} name={s.name || 'Student'} onChange={(st) => set(s.student_id, st)} />} />
              ))}
            </Card>
            {list.length > shown ? <View style={{ alignSelf: 'flex-start' }}><LinkText label={`Show more (${list.length - shown} left)`} onPress={() => setShown((n) => n + PAGE)} /></View> : null}
            <View style={{ height: BAR_H }} />
          </>
        ) : null}
      </Screen>

      {sheet && roster.length > 0 ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: TAB_BAR + Math.max(insets.bottom, 8), height: BAR_H, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{counts.Present} present · {counts.Absent} absent</Text>
            <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>{sheet.already_marked ? (changed ? plural(changed, 'unsaved change') : 'No changes yet') : 'Not saved yet'}</Text>
          </View>
          <View style={{ minWidth: 150 }}>
            <Button label={sheet.already_marked ? 'Update' : 'Save'} icon="save-outline" loading={saving} disabled={sheet.already_marked && changed === 0} onPress={confirm} />
          </View>
        </View>
      ) : null}
    </>
  );
}

export default function Attendance() {
  const { c } = useAppTheme();
  const { user } = useAuth();
  const teacherId = user?.id ?? 0;
  const subjects = useLoad(teacherId ? [`/teacher/${teacherId}/assigned-subjects`] : null);
  const [mode, setMode] = useState<'mark' | 'history'>('mark');
  const [subjectId, setSubjectId] = useState('');
  const refreshFn = useRef<() => void>(() => {});
  const setRefresh = (fn: () => void) => { refreshFn.current = fn; };

  const list: Subject[] = Array.isArray(subjects.data?.[0]) ? subjects.data![0] : [];
  useEffect(() => {
    if (list.length > 0 && !list.some((s) => String(s.id) === subjectId)) setSubjectId(String(list[0].id));
  }, [list, subjectId]);

  const header = <Segmented value={mode} onChange={setMode} options={[{ value: 'mark', label: 'Mark today' }, { value: 'history', label: 'History' }]} />;

  if (mode === 'history') {
    const semesters = [...new Set(list.map((s) => s.semester))].sort((a, b) => a - b);
    return (
      <Screen onRefresh={() => refreshFn.current()} refreshing={false}>
        {header}
        {teacherId ? <AttendanceHistory teacherId={teacherId} semesters={semesters} onRefreshRef={setRefresh} /> : null}
      </Screen>
    );
  }

  if (subjects.loading && !subjects.data) return <Screen>{header}<LoadingBlock cards={3} /></Screen>;
  if (subjects.error && !subjects.data) return <Screen onRefresh={subjects.refresh} refreshing={subjects.refreshing}>{header}<ErrorState message={subjects.error} onRetry={subjects.reload} /></Screen>;
  if (list.length === 0) return <Screen onRefresh={subjects.refresh} refreshing={subjects.refreshing}>{header}<EmptyState text="You have no subjects assigned yet, so there is no attendance to mark." icon="school-outline" /></Screen>;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 0, backgroundColor: c.bg }}>{header}</View>
      <Marking teacherId={teacherId} subjects={list} subjectId={subjectId} onSubject={setSubjectId} onRefreshRef={setRefresh} />
    </View>
  );
}
