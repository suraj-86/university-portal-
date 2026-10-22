import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { useAppTheme } from '@/context/ThemeContext';
import { Badge, Card, ChartCard, EmptyState, Gate, Notice, Row, Screen, SelectField, T, useLoad } from '@/components/ui';
import WardScreen from '@/components/WardScreen';
import { plural } from '@/lib/format';
import type { WardTarget } from '@/hooks/useWardTarget';

const STATUS: Record<string, { label: string; tone: 'success' | 'danger' | 'warn' | 'neutral' }> = {
  PASSED: { label: 'Passed', tone: 'success' },
  BACKLOG: { label: 'Not cleared', tone: 'danger' },
  PROVISIONAL: { label: 'Provisional', tone: 'warn' },
  PENDING: { label: 'Results awaited', tone: 'neutral' },
};

const show = (v: any, d = 2) => (v === null || v === undefined ? '—' : Number(v).toFixed(d));

function Card_({ t }: { t: WardTarget }) {
  const { c } = useAppTheme();
  const load = useLoad([`/student/${t.studentUserId}/report-card`]);
  const [picked, setPicked] = useState<string | null>(null);
  const val = (x: any) => <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, maxWidth: 200, textAlign: 'right' }}>{x === null || x === undefined || x === '' ? '—' : String(x)}</Text>;

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {t.top}
      <Gate load={load} cards={3}>
        {([d]) => {
          const { student, semesters, overall, grading } = d;
          const withMarks = semesters.filter((s: any) => s.subjects.some((x: any) => x.evaluated));
          const defaultSem = (withMarks.length ? withMarks[withMarks.length - 1] : semesters[semesters.length - 1])?.semester;
          const semKey = picked ?? (defaultSem !== undefined ? String(defaultSem) : '');
          const sem = semesters.find((s: any) => String(s.semester) === semKey);
          const hasProvisional = !!sem?.subjects.some((x: any) => x.provisional);

          return (
            <>
              <Card>
                <T v="h2">{student.name}</T>
                <T v="small" style={{ marginBottom: 6 }}>{student.courseName ? `${student.courseName} (${student.courseCode})` : ''}</T>
                <Row title="Enrollment no." right={val(student.enrollmentNumber)} />
                <Row title="Roll no." right={val(student.rollNumber)} />
                <Row title="Department" right={val(student.department)} />
                <Row title="Current semester" right={val(student.currentSemester)} last />
              </Card>

              {semesters.length > 0 && (
                <ChartCard title="Overall (all semesters)" hint="CGPA is provisional.">
                  <Row title="CGPA" right={val(show(overall.cgpa))} />
                  <Row title="Overall percentage" right={val(overall.percentage === null ? null : `${Number(overall.percentage).toFixed(1)}%`)} />
                  <Row title="Credits earned" right={val(overall.earnedCredits)} />
                  <Row title="Backlogs" right={<Text style={{ color: overall.backlogs > 0 ? c.danger : c.text, fontWeight: '700', fontSize: 14 }}>{overall.backlogs}</Text>} last />
                </ChartCard>
              )}

              {semesters.length === 0 ? <Card><EmptyState text="No marks have been published yet." icon="document-text-outline" /></Card> : (
                <SelectField label="Semester" value={semKey} options={semesters.map((s: any) => ({ value: String(s.semester), label: `Semester ${s.semester}` }))} onChange={(v) => setPicked(String(v))} />
              )}

              {sem && (
                <>
                  <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <T v="h2">Semester {sem.semester}</T>
                      <Badge label={STATUS[sem.status]?.label || sem.status} tone={STATUS[sem.status]?.tone || 'neutral'} />
                    </View>
                    <Row title="SGPA" right={val(show(sem.sgpa))} />
                    <Row title="Percentage" right={val(sem.percentage === null ? null : `${Number(sem.percentage).toFixed(1)}%`)} />
                    <Row title="Marks" right={val(sem.maximum > 0 ? `${sem.obtained} / ${sem.maximum}` : null)} />
                    <Row title="Credits earned" right={val(`${sem.earnedCredits} / ${sem.totalCredits}`)} />
                    <Row last title="Attendance" right={val(sem.attendance.total > 0 ? `${sem.attendance.present}/${sem.attendance.total} (${Number(sem.attendance.percentage).toFixed(1)}%)` : 'None recorded')} />
                  </Card>

                  {sem.subjects.map((s: any) => (
                    <Card key={s.id}>
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <T v="label">{s.code} · {plural(Number(s.credits) || 0, 'credit')}</T>
                            <T v="h2">{s.name}</T>
                          </View>
                          {s.evaluated
                            ? <Badge label={`${s.grade}${s.provisional ? '*' : ''}`} tone={s.passed ? 'success' : 'danger'} />
                            : <Badge label="Not evaluated" tone="neutral" />}
                        </View>
                        {s.evaluated ? (
                          <>
                            {s.components.map((cmp: any, i: number) => (
                              <View key={`${cmp.label}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <T v="small">{cmp.label}</T>
                                <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>{cmp.score} / {cmp.max}</Text>
                              </View>
                            ))}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 6, marginTop: 2 }}>
                              <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>{s.total} / {s.totalMax} · {Number(s.percentage).toFixed(1)}%</Text>
                              <Text style={{ color: c.muted, fontWeight: '700', fontSize: 12 }}>GP {show(s.gradePoint)}</Text>
                            </View>
                          </>
                        ) : null}
                      </View>
                    </Card>
                  ))}
                </>
              )}

              {hasProvisional && <Notice tone="warn">* End-semester or practical marks are not yet entered for this subject, so the grade is provisional.</Notice>}
              {grading && !grading.official && <Notice tone="warn">Grade points, SGPA and CGPA are provisional: the university's official grading scheme has not been applied yet.</Notice>}
              {grading && (
                <Card>
                  <T v="label" style={{ marginBottom: 4 }}>Grading scheme</T>
                  <T v="small">{(grading.legend || []).map((l: any) => `${l.grade} = ${l.range}`).join('; ')}. Pass mark: {grading.passPercent}% per subject.</T>
                  {grading.gradePointRule ? <T v="small" style={{ marginTop: 4 }}>{grading.gradePointRule}</T> : null}
                </Card>
              )}
              <T v="small">Generated from University Portal records on {d.generatedOn}.</T>
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

export default function ReportCard() {
  return <WardScreen>{(t) => <Card_ key={t.studentUserId} t={t} />}</WardScreen>;
}
