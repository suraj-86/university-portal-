import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLoad, Screen, Gate, DashHeader, ShortcutRow, AttentionPanel, AttentionItem, ChartCard, T, B, LinkText, Row, Badge, Sheet, EmptyState, LineChart, HBars, BarChart } from '@/components/ui';
import { plural, weekLabel } from '@/lib/format';

const STATE_BADGE: Record<string, { label: string; tone: 'danger' | 'success' | 'neutral' }> = {
  unmarked: { label: 'Not marked', tone: 'danger' },
  marked: { label: 'Marked', tone: 'success' },
  upcoming: { label: 'Upcoming', tone: 'neutral' },
};

export default function TeacherHome() {
  const { c } = useAppTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [viewing, setViewing] = useState<any>(null);
  const go = (p: string) => router.navigate(`/teacher/${p}` as any);

  const insights = useLoad(user?.id ? [`/teacher/${user.id}/insights`] : null);
  // Notices and unread counts are nice to have; the dashboard works without them.
  const extras = useLoad(user?.id ? [`/teacher/${user.id}/dashboard`, '/inbox/counts'] : null);
  const [soft, setSoft] = useState<{ notices: any[]; counts: any }>({ notices: [], counts: {} });
  useEffect(() => {
    if (!extras.data) return;
    setSoft({ notices: extras.data[0]?.notices || [], counts: extras.data[1] || {} });
  }, [extras.data]);

  const refresh = () => { insights.refresh(); extras.refresh(); };

  return (
    <Screen onRefresh={refresh} refreshing={insights.refreshing || extras.refreshing}>
      <Gate load={insights} cards={4}>
        {([d]) => {
          const { notices, counts } = soft;
          const { todayClasses, atRisk, trend, analytics } = d;
          const low = trend.lowThreshold;
          const first = d.firstUnmarked;

          const facts: { label: string; onPress?: () => void }[] = [
            { label: plural(d.counts.subjects, 'subject'), onPress: () => go('subjects') },
            { label: plural(d.counts.students, 'student') },
            { label: `${plural(d.counts.classesToday, 'class', 'classes')} today`, onPress: () => go('timetable') },
          ];
          if (d.counts.averageAttendance !== null) facts.push({ label: `${d.counts.averageAttendance}% average attendance` });

          const items: AttentionItem[] = [];
          if (first) {
            const more = d.unmarkedCount - 1;
            items.push({ key: 'unmarked', tone: 'danger', action: { label: 'Mark attendance', onPress: () => go('attendance') },
              text: <>Attendance is <B>not marked</B> for <B>{first.subject}, {first.start}</B> ({first.course} Sem {first.semester}){more > 0 ? ` and ${plural(more, 'other class', 'other classes')}` : ''}</> });
          }
          if (atRisk.count > 0) {
            items.push({ key: 'risk', tone: 'warn', action: { label: 'Mark attendance', onPress: () => go('attendance') },
              text: <><B>{plural(atRisk.count, 'student')}</B> {atRisk.count === 1 ? 'is' : 'are'} below {low}% attendance in your subjects</> });
          }
          if (counts.messages > 0) items.push({ key: 'msg', tone: 'info', action: { label: 'Open messages', onPress: () => go('messages') }, text: <B>{plural(counts.messages, 'unread message')}</B> });
          if (counts.notices > 0) items.push({ key: 'notice', tone: 'info', action: { label: 'Open notices', onPress: () => go('notices') }, text: <B>{plural(counts.notices, 'unread notice')}</B> });

          const attRows = analytics.attendanceBySubject.map((x: any) => ({ label: x.subject, value: x.percent }));
          const marksRows = analytics.marksBySubject.map((x: any) => ({ label: x.subject, value: x.average, note: `${x.entries} entries · ${x.passRate}% passed` }));
          const bands = analytics.marksBands.map((b: any) => ({ label: b.label.replace(' and above', '+').replace('Below ', '<'), value: b.count }));
          const bandMax = Math.max(1, ...bands.map((b: any) => b.value));

          return (
            <>
              <DashHeader name={d.teacherName || user?.full_name || 'Professor'} facts={facts} />
              <ShortcutRow items={[
                { label: 'Attendance', icon: 'calendar-outline', onPress: () => go('attendance'), badge: d.unmarkedCount || undefined },
                { label: 'Marks', icon: 'create-outline', onPress: () => go('marks') },
                { label: 'Timetable', icon: 'time-outline', onPress: () => go('timetable') },
                { label: 'Notices', icon: 'notifications-outline', onPress: () => go('notices'), badge: counts.notices || undefined },
                { label: 'Messages', icon: 'chatbubbles-outline', onPress: () => go('messages'), badge: counts.messages || undefined },
                { label: 'My Subjects', icon: 'book-outline', onPress: () => go('subjects') },
              ]} />
              <AttentionPanel items={items} />

              <ChartCard compact title="Today's classes" footer={<LinkText label="Open timetable" onPress={() => go('timetable')} />}>
                {todayClasses.length === 0 ? <EmptyState text="You have no classes scheduled today." icon="calendar-outline" /> : todayClasses.map((k: any, i: number) => {
                  const chip = STATE_BADGE[k.state] || STATE_BADGE.upcoming;
                  return (
                    <Row key={k.id} last={i === todayClasses.length - 1} title={k.subject}
                      subtitle={`${k.course} Sem ${k.semester}${k.room ? ` · Room ${k.room}` : ''}`}
                      right={<View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>{k.start}</Text><Badge label={chip.label} tone={chip.tone} /></View>} />
                  );
                })}
              </ChartCard>

              <ChartCard compact title="Attendance, week by week" hint={`Present % per week for each subject, last ${trend.weeks.length} weeks. Dashed line is ${low}%.`}>
                {trend.series.length === 0 ? <EmptyState text="No attendance has been recorded yet." /> : (
                  <LineChart labels={trend.weeks.map(weekLabel)} mark={low} series={trend.series.map((s: any) => ({ name: s.subject, values: s.values }))} />
                )}
              </ChartCard>

              <ChartCard compact title="Overall attendance by subject" hint={`Present % across all classes so far. The mark is ${low}%.`} footer={<LinkText label="Open attendance" onPress={() => go('attendance')} />}>
                {attRows.length === 0 ? <EmptyState text="No attendance has been recorded yet." /> : <HBars mark={low} rows={attRows} />}
              </ChartCard>

              <ChartCard compact title="Average marks by subject" hint={`% of marks across all assessments. The mark is the ${analytics.passPercent}% pass mark.`} footer={<LinkText label="Open marks entry" onPress={() => go('marks')} />}>
                {marksRows.length === 0 ? <EmptyState text="No marks entered yet." /> : <HBars mark={analytics.passPercent} rows={marksRows} />}
              </ChartCard>

              <ChartCard compact title="Marks distribution" hint="All marks you have entered, by percentage band.">
                {bands.every((b: any) => b.value === 0) ? <EmptyState text="No marks entered yet." /> : <BarChart data={bands} max={bandMax} unit="" />}
              </ChartCard>

              <ChartCard compact title="Students at risk in your subjects" hint={atRisk.count > 8 ? `Showing the 8 lowest of ${atRisk.count}.` : `Below ${low}% attendance.`} footer={<LinkText label="Open attendance" onPress={() => go('attendance')} />}>
                {atRisk.items.length === 0 ? <EmptyState text={`No student is below ${low}% attendance.`} icon="checkmark-circle-outline" /> : atRisk.items.map((s: any, i: number) => (
                  <Row key={`${s.student_id}-${s.subject_id}`} last={i === atRisk.items.length - 1} title={s.name}
                    subtitle={`${s.subject}${s.roll ? ` · Roll ${s.roll}` : ''} · needs ${plural(s.needed, 'class', 'classes')} in a row`}
                    right={<Text style={{ color: s.percent < 60 ? c.danger : c.warn, fontWeight: '700' }}>{s.percent}%</Text>} />
                ))}
              </ChartCard>

              <ChartCard compact title="Recent notices" footer={<LinkText label="Open notices" onPress={() => go('notices')} />}>
                {notices.length === 0 ? <EmptyState text="No recent notices." icon="notifications-outline" /> : notices.map((n: any, i: number) => (
                  <Row key={n.id} last={i === notices.length - 1} title={n.title} subtitle={`${n.date}${n.type ? ` · ${n.type}` : ''}`} onPress={() => setViewing(n)} />
                ))}
              </ChartCard>
            </>
          );
        }}
      </Gate>

      <Sheet visible={!!viewing} title={viewing?.title || ''} onClose={() => setViewing(null)}>
        <T v="small">{viewing?.date}{viewing?.type ? ` · ${viewing.type}` : ''}</T>
        <T v="body">{viewing?.content || viewing?.title}</T>
      </Sheet>
    </Screen>
  );
}
