import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { useAppTheme } from '@/context/ThemeContext';
import { B, Badge, Card, ChartCard, EmptyState, Gate, HBars, LinkText, Notice, Row, Screen, SelectField, T, useLoad } from '@/components/ui';
import WardScreen from '@/components/WardScreen';
import { dateLabel, plural } from '@/lib/format';
import type { WardTarget } from '@/hooks/useWardTarget';

const REQUIRED = 75;
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({ value: s, label: `Semester ${s}` }));
const PAGE = 20;

// Only 'Present' counts as attended; Late and Excused are shown separately.
const need = (present: number, total: number) => Math.max(0, Math.ceil((REQUIRED * total - 100 * present) / 25));

function Records({ t, semester, onSemester }: { t: WardTarget; semester: number; onSemester: (s: number) => void }) {
  const { c } = useAppTheme();
  const q = `?semester=${semester}`;
  const load = useLoad([`/student/${t.studentUserId}/attendance-logs${q}`, `/student/${t.studentUserId}/subjects-list${q}`]);
  const [subject, setSubject] = useState('All');
  const [shown, setShown] = useState(PAGE);

  const stats = useMemo(() => {
    const logs: any[] = Array.isArray(load.data?.[0]) ? load.data![0] : [];
    const subs: any[] = Array.isArray(load.data?.[1]) ? load.data![1] : [];
    const count = (rows: any[], status: string) => rows.filter((l) => l.status === status).length;
    const make = (rows: any[]) => {
      const present = count(rows, 'Present');
      return { present, absent: count(rows, 'Absent'), late: count(rows, 'Late'), excused: count(rows, 'Excused'), total: rows.length, percent: rows.length ? Math.round((present / rows.length) * 100) : null as number | null };
    };
    const bySubject = subs.map((s) => ({ name: s.subject_name as string, ...make(logs.filter((l) => l.subject_name === s.subject_name)) }));
    return { logs, bySubject, all: make(logs) };
  }, [load.data]);

  const current = subject === 'All' ? { name: 'All subjects', ...stats.all } : stats.bySubject.find((s) => s.name === subject) || { name: subject, ...stats.all, present: 0, absent: 0, late: 0, excused: 0, total: 0, percent: null };
  const logs = (subject === 'All' ? stats.logs : stats.logs.filter((l) => l.subject_name === subject));
  const low = current.percent !== null && current.percent < REQUIRED;
  const who = t.parent ? t.subject : 'You';

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {t.top}
      <SelectField label="Semester" value={semester} options={SEMESTERS} onChange={(v) => { onSemester(Number(v)); setSubject('All'); setShown(PAGE); }} />
      <Gate load={load} cards={3}>
        {() => (
          <>
            <SelectField label="Subject" value={subject} options={[{ value: 'All', label: 'All subjects' }, ...stats.bySubject.map((s) => ({ value: s.name, label: s.name }))]} onChange={(v) => { setSubject(String(v)); setShown(PAGE); }} />

            <Card>
              {current.total === 0 ? (
                <EmptyState text="No attendance has been recorded for this selection yet." icon="calendar-outline" />
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ color: low ? c.danger : c.success, fontSize: 32, fontWeight: '700' }}>{current.percent}%</Text>
                    <Badge label={low ? `Below ${REQUIRED}%` : `Safe · ${REQUIRED}% needed`} tone={low ? 'danger' : 'success'} />
                  </View>
                  <T v="muted">
                    <B>{current.present}</B> present of <B>{current.total}</B> classes · {current.absent} absent
                    {current.late ? ` · ${current.late} late` : ''}{current.excused ? ` · ${current.excused} excused` : ''}
                  </T>
                  {low && (
                    <Notice tone="warn">{who === 'You' ? 'You need' : `${who} needs`} {plural(need(current.present, current.total), 'class', 'classes')} in a row to get back to {REQUIRED}%.</Notice>
                  )}
                </View>
              )}
            </Card>

            {subject === 'All' && stats.bySubject.length > 0 && (
              <ChartCard title="By subject" hint={`Present % across all classes this semester. The mark is ${REQUIRED}%.`}>
                <HBars mark={REQUIRED} rows={stats.bySubject.filter((s) => s.percent !== null).map((s) => ({ label: s.name, value: s.percent as number, note: `${s.present} of ${s.total} classes${s.total >= 5 && s.percent! < REQUIRED ? ` · needs ${need(s.present, s.total)} in a row` : ''}` }))} />
                {stats.bySubject.some((s) => s.percent === null) && <T v="small" style={{ marginTop: 10 }}>Subjects with no classes held yet are not shown.</T>}
              </ChartCard>
            )}

            <ChartCard title="Class by class" hint="Most recent first.">
              {logs.length === 0 ? <EmptyState text="No attendance history for this selection." /> : (
                <>
                  {logs.slice(0, shown).map((l, i) => (
                    <Row key={`${l.class_date}-${l.subject_name}-${i}`} last={i === Math.min(shown, logs.length) - 1} title={l.subject_name} subtitle={dateLabel(l.class_date)}
                      right={<Badge label={l.status} tone={l.status === 'Present' ? 'success' : l.status === 'Absent' ? 'danger' : l.status === 'Late' ? 'warn' : 'neutral'} />} />
                  ))}
                  {logs.length > shown && <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><LinkText label={`Show more (${logs.length - shown} left)`} onPress={() => setShown((n) => n + PAGE)} /></View>}
                </>
              )}
            </ChartCard>
            <T v="small">Only classes marked Present count towards attendance.</T>
          </>
        )}
      </Gate>
    </Screen>
  );
}

function Inner({ t }: { t: WardTarget }) {
  // Start on the student's current semester.
  const profile = useLoad([`/student/${t.studentUserId}/profile`]);
  const [semester, setSemester] = useState<number | null>(null);
  const fromProfile = Number(String(profile.data?.[0]?.academic?.semester || '').replace(/[^0-9]/g, '')) || 1;
  if (!profile.data && !profile.error) return <Screen>{t.top}<Gate load={profile}>{() => null}</Gate></Screen>;
  return <Records t={t} semester={semester ?? fromProfile} onSemester={setSemester} />;
}

export default function Attendance() {
  return <WardScreen>{(t) => <Inner key={t.studentUserId} t={t} />}</WardScreen>;
}
