import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { Card, EmptyState, Gate, LinkText, ProgressBar, Screen, SelectField, T, useLoad } from '@/components/ui';
import WardScreen from '@/components/WardScreen';
import { plural } from '@/lib/format';
import type { WardTarget } from '@/hooks/useWardTarget';

function Cards({ t, insights }: { t: WardTarget; insights: any }) {
  const { c } = useAppTheme();
  const router = useRouter();
  const current = Number(insights.profile.semester) || 1;
  const [semester, setSemester] = useState(current);
  const load = useLoad([`/student/${t.studentUserId}/subjects?semester=${semester}`]);
  const subjects: any[] = load.data ? load.data[0].subjects || [] : [];
  const semesters: number[] = load.data?.[0]?.available_semesters?.length ? load.data[0].available_semesters : Array.from({ length: Math.max(current, 4) }, (_, i) => i + 1);
  const attBy = new Map<number, any>(insights.attendance.bySubject.map((a: any) => [a.subject_id, a]));
  const low = insights.attendance.lowThreshold;
  const credits = subjects.reduce((s, x) => s + (Number(x.credits) || 0), 0);

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {t.top}
      <View style={{ gap: 4 }}>
        <T v="muted">
          {load.data ? `Semester ${semester}${semester === current ? ' (current)' : ''} · ${plural(subjects.length, 'subject')}${credits ? ` · ${plural(credits, 'credit')}` : ''}` : ' '}
        </T>
      </View>
      <SelectField label="Semester" value={semester} options={semesters.map((s) => ({ value: s, label: `Semester ${s}` }))} onChange={(v) => setSemester(Number(v))} />
      <Gate load={load} cards={3}>
        {() => subjects.length === 0 ? <Card><EmptyState text="No subjects are listed for this semester yet." icon="book-outline" /></Card> : (
          <>
            {subjects.map((s) => {
              const att = semester === current ? attBy.get(s.id) : null;
              const isLow = att && att.percent !== null && att.percent < low;
              return (
                <Card key={s.id}>
                  <View style={{ gap: 8 }}>
                    <T v="label">{s.code}{s.credits ? ` · ${plural(Number(s.credits), 'credit')}` : ''}</T>
                    <T v="h2">{s.name}</T>
                    <T v="muted">Taught by <Text style={{ color: c.text, fontWeight: '700' }}>{s.teacher_name}</Text></T>
                    {att && att.total > 0 && (
                      <View style={{ gap: 6, marginTop: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <T v="muted">Attendance</T>
                          <Text style={{ color: isLow ? c.warn : c.text, fontWeight: '700', fontSize: 14 }}>{att.percent}%{isLow ? ` (below ${low}%)` : ''}</Text>
                        </View>
                        <ProgressBar value={att.percent} tone={isLow ? 'warn' : 'success'} />
                        <T v="small">{att.present} of {att.total} classes attended</T>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
            <LinkText label="Open attendance" onPress={() => router.navigate(`${t.base}/attendance` as any)} />
          </>
        )}
      </Gate>
    </Screen>
  );
}

function Inner({ t }: { t: WardTarget }) {
  const load = useLoad([`/student/${t.studentUserId}/insights`]);
  return (
    <>
      {load.data ? <Cards t={t} insights={load.data[0]} /> : <Screen onRefresh={load.refresh} refreshing={load.refreshing}>{t.top}<Gate load={load} cards={3}>{() => null}</Gate></Screen>}
    </>
  );
}

export default function Subjects() {
  return <WardScreen>{(t) => <Inner key={t.studentUserId} t={t} />}</WardScreen>;
}
