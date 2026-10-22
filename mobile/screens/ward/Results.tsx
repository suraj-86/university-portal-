import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { Badge, Card, EmptyState, Gate, LinkText, Notice, ProgressBar, Screen, SelectField, T, useLoad } from '@/components/ui';
import WardScreen from '@/components/WardScreen';
import { plural } from '@/lib/format';
import type { WardTarget } from '@/hooks/useWardTarget';

const num = (v: any) => (v === null || v === undefined ? null : Number(v));

function Marks({ t }: { t: WardTarget }) {
  const { c } = useAppTheme();
  const router = useRouter();
  const load = useLoad([`/student/${t.studentUserId}/results`]);
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {t.top}
      <Gate load={load} cards={3}>
        {([data]) => {
          const results: Record<string, any[]> = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
          const semesters = Object.keys(results).sort((a, b) => Number(a) - Number(b));
          if (semesters.length === 0) return <Card><EmptyState text={`No marks have been published for ${t.parent ? t.subject : 'you'} yet.`} icon="ribbon-outline" /></Card>;
          const sem = picked && results[picked] ? picked : semesters[semesters.length - 1];
          const subs = results[sem] || [];
          const earned = subs.reduce((a, s) => a + (Number(s.total) || 0), 0);
          const max = subs.reduce((a, s) => a + (Number(s.totalMax) || 100), 0);
          const pct = max > 0 ? ((earned / max) * 100).toFixed(1) : '0.0';

          return (
            <>
              <SelectField label="Semester" value={sem} options={semesters.map((s) => ({ value: s, label: `Semester ${s}` }))} onChange={(v) => setPicked(String(v))} />
              <T v="muted">{plural(subs.length, 'subject')} evaluated · <Text style={{ color: c.text, fontWeight: '700' }}>{pct}%</Text> overall</T>

              {subs.map((s) => {
                const total = Number(s.total) || 0;
                const totalMax = Number(s.totalMax) || 100;
                const percent = Math.round((total / totalMax) * 100);
                const parts = [
                  { label: s.labels?.assignment || 'Assignment', v: num(s.assignment) },
                  { label: s.labels?.sessional1 || 'Sessional 1', v: num(s.sessional1) },
                  { label: s.labels?.sessional2 || 'Sessional 2', v: num(s.sessional2) },
                  { label: s.labels?.endSem || 'End semester', v: num(s.endSem) },
                  { label: 'Other', v: num(s.other) },
                ].filter((p) => p.v !== null);
                const fail = s.grade === 'F';
                return (
                  <Card key={s.id}>
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <T v="h2">{s.subject}</T>
                          {s.credits ? <T v="small">{plural(Number(s.credits), 'credit')}</T> : null}
                        </View>
                        <Badge label={`Grade ${s.grade || 'N/A'}`} tone={fail ? 'danger' : String(s.grade || '').includes('A') ? 'success' : 'info'} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{total} / {totalMax}</Text>
                        <Text style={{ color: fail ? c.danger : c.muted, fontWeight: '700', fontSize: 13 }}>{percent}%</Text>
                      </View>
                      <ProgressBar value={percent} tone={fail ? 'danger' : 'info'} />
                      {parts.length > 0 && (
                        <View style={{ gap: 4, marginTop: 2 }}>
                          {parts.map((p) => (
                            <View key={p.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <T v="small">{p.label}</T>
                              <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>{p.v}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })}

              <Notice tone="info">Grades here are a quick guide. SGPA, CGPA and backlogs are on the Report Card and are provisional until the university confirms its grading scheme.</Notice>
              <LinkText label="Open report card" onPress={() => router.navigate(`${t.base}/report-card` as any)} />
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

export default function Results() {
  return <WardScreen>{(t) => <Marks key={t.studentUserId} t={t} />}</WardScreen>;
}
