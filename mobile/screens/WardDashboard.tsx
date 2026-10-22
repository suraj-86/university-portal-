import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useLoad, Screen, Gate, DashHeader, ShortcutRow, AttentionPanel, AttentionItem, Card, ChartCard, T, B, LinkText, Row, Sheet, EmptyState, ProgressBar, LineChart, HBars, GroupedBars, BarChart } from '@/components/ui';
import { money, plural, weekLabel, dateLabel } from '@/lib/format';
import { downloadAndShare } from '@/lib/download';

// Dashboard shared by the student app and the parent app (which shows one ward at a time).
export default function WardDashboard({ studentUserId, base, parent = false, greetingName, subject = 'You', top }: {
  studentUserId: number; base: string; parent?: boolean; greetingName: string; subject?: string; top?: React.ReactNode;
}) {
  const { c } = useAppTheme();
  const router = useRouter();
  const [viewing, setViewing] = useState<any>(null);
  const go = (p: string) => router.navigate(`${base}/${p}` as any);

  const insights = useLoad([`/student/${studentUserId}/insights`]);
  // Report card, notices and unread counts are nice to have; the dashboard works without them.
  const extras = useLoad([`/student/${studentUserId}/report-card`, `/student/${studentUserId}/custom-dashboard`, '/inbox/counts']);
  const [softExtras, setSoftExtras] = useState<{ card: any; notices: any[]; counts: any }>({ card: null, notices: [], counts: {} });
  React.useEffect(() => {
    if (!extras.data) return;
    setSoftExtras({ card: extras.data[0]?.overall ? extras.data[0] : null, notices: extras.data[1]?.notices || [], counts: extras.data[2] || {} });
  }, [extras.data]);

  const refreshing = insights.refreshing || extras.refreshing;
  const refresh = () => { insights.refresh(); extras.refresh(); };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {top}
      <Gate load={insights} cards={4}>
        {([d]) => {
          const { card, notices, counts } = softExtras;
          const { attendance, marks, fees, payments, nextClasses, hostel, profile } = d;
          const low = attendance.lowThreshold;
          const possessive = parent ? `${subject}'s` : 'Your';
          const lowSubjects = attendance.bySubject.filter((s: any) => s.percent !== null && s.percent < low && s.total >= 5);
          const overdue = fees.unpaid.filter((f: any) => f.daysToDue !== null && f.daysToDue < 0);
          const dueSoon = fees.unpaid.filter((f: any) => f.daysToDue !== null && f.daysToDue >= 0 && f.daysToDue <= fees.dueSoonDays);

          const facts: { label: string; onPress?: () => void }[] = [{ label: `${profile.course} Semester ${profile.semester}`, onPress: () => go('subjects') }];
          if (attendance.overall !== null) facts.push({ label: `${attendance.overall}% attendance`, onPress: () => go('attendance') });
          if (card?.overall?.cgpa) facts.push({ label: `CGPA ${card.overall.cgpa} (provisional)`, onPress: () => go('report-card') });
          facts.push({ label: `${plural(d.classesToday, 'class', 'classes')} today`, onPress: () => go('timetable') });

          const items: AttentionItem[] = [];
          if (overdue.length) {
            const amount = overdue.reduce((s: number, f: any) => s + f.balance, 0);
            items.push({ key: 'overdue', tone: 'danger', action: { label: parent ? 'Pay fees' : 'Pay now', onPress: () => go('fees') },
              text: <><B>{money(amount)}</B> in fees {parent ? `for ${subject} ` : ''}{overdue.length === 1 ? 'is' : 'are'} <B>overdue</B> ({overdue.map((f: any) => f.fee_type).join(', ')})</> });
          }
          if (dueSoon.length) {
            const f = dueSoon[0];
            const when = f.daysToDue === 0 ? 'today' : `in ${plural(f.daysToDue, 'day')}`;
            items.push({ key: 'duesoon', tone: 'warn', action: { label: 'View fees', onPress: () => go('fees') },
              text: <><B>{money(f.balance)}</B> for <B>{f.fee_type}</B> is due <B>{when}</B>{dueSoon.length > 1 ? ` and ${plural(dueSoon.length - 1, 'other fee')} soon` : ''}</> });
          }
          if (lowSubjects.length) {
            const worst = [...lowSubjects].sort((a: any, b: any) => a.percent - b.percent)[0];
            items.push({ key: 'lowatt', tone: 'warn', action: { label: 'See attendance', onPress: () => go('attendance') },
              text: <>{possessive} attendance is below {low}% in <B>{plural(lowSubjects.length, 'subject')}</B>; lowest is <B>{worst.subject} at {worst.percent}%</B>, so {parent ? 'they need' : 'you need'} <B>{plural(worst.needed, 'class', 'classes')} in a row</B> to recover</> });
          }
          if (card?.overall?.backlogs > 0) {
            items.push({ key: 'backlog', tone: 'warn', action: { label: 'Open report card', onPress: () => go('report-card') },
              text: <>{parent ? `${subject} has` : 'You have'} <B>{plural(card.overall.backlogs, 'backlog')}</B> in the provisional results</> });
          }
          if (counts.messages > 0) items.push({ key: 'msg', tone: 'info', action: { label: 'Open messages', onPress: () => go('messages') }, text: <B>{plural(counts.messages, 'unread message')}</B> });
          if (counts.notices > 0) items.push({ key: 'notice', tone: 'info', action: { label: 'Open notices', onPress: () => go('notices') }, text: <B>{plural(counts.notices, 'unread notice')}</B> });

          const semData = (card?.semesters || []).filter((s: any) => s.percentage !== null && s.percentage !== undefined).map((s: any) => ({ label: `Sem ${s.semester}`, value: Number(s.percentage) }));
          const paidPct = fees.billed ? Math.min(100, Math.round((fees.paid / fees.billed) * 100)) : 0;

          return (
            <>
              <DashHeader name={greetingName} facts={facts} />
              <ShortcutRow items={[
                { label: 'Attendance', icon: 'calendar-outline', onPress: () => go('attendance') },
                { label: 'Results', icon: 'ribbon-outline', onPress: () => go('results') },
                { label: 'Fees', icon: 'wallet-outline', onPress: () => go('fees'), badge: overdue.length || undefined },
                { label: 'Timetable', icon: 'time-outline', onPress: () => go('timetable') },
                { label: 'Notices', icon: 'notifications-outline', onPress: () => go('notices'), badge: counts.notices || undefined },
                { label: 'Report Card', icon: 'document-text-outline', onPress: () => go('report-card') },
              ]} />
              <AttentionPanel items={items} />

              <ChartCard compact title="Classes coming up" footer={<LinkText label="Open timetable" onPress={() => go('timetable')} />}>
                {nextClasses.length === 0 ? <EmptyState text="No upcoming classes are scheduled." icon="calendar-outline" /> : nextClasses.slice(0, 3).map((n: any, i: number, a: any[]) => (
                  <Row key={n.id} last={i === a.length - 1} title={n.subject}
                    subtitle={[n.room ? `Room ${n.room}` : 'Room to be announced', n.faculty].filter(Boolean).join(' · ')}
                    right={<View style={{ alignItems: 'flex-end' }}><Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>{n.start}</Text><T v="small">{n.day}</T></View>} />
                ))}
              </ChartCard>

              <ChartCard compact title="Attendance, week by week" hint={`Present % per week, last ${attendance.trend.weeks.length} weeks. Dashed line is ${low}%.`}>
                <LineChart labels={attendance.trend.weeks.map(weekLabel)} mark={low} series={[{ name: 'Overall', values: attendance.trend.values }]} />
              </ChartCard>

              <ChartCard compact title="Attendance by subject" hint={`Present % across all classes so far. The mark is ${low}%.`} footer={<LinkText label="Open attendance" onPress={() => go('attendance')} />}>
                {attendance.bySubject.length === 0 ? <EmptyState text="No attendance has been recorded yet." /> : (
                  <HBars mark={low} rows={attendance.bySubject.filter((s: any) => s.percent !== null).map((s: any) => ({ label: s.subject, value: s.percent, note: `${s.present} of ${s.total} classes` }))} />
                )}
              </ChartCard>

              <ChartCard compact title="Marks compared with the class" hint="% of marks across all assessments so far, next to the class average." footer={<LinkText label="Open results" onPress={() => go('results')} />}>
                {marks.length === 0 ? <EmptyState text="No marks have been entered yet." /> : (
                  <GroupedBars names={[parent ? subject : 'You', 'Class average']} rows={marks.map((m: any) => ({ label: m.subject, a: m.mine, b: m.classAverage }))} />
                )}
              </ChartCard>

              {semData.length > 0 && (
                <ChartCard compact title="Marks by semester" hint="Overall percentage in each semester (provisional)." footer={<LinkText label="Open report card" onPress={() => go('report-card')} />}>
                  <BarChart data={semData} />
                </ChartCard>
              )}

              <ChartCard compact title="Fees" hint={`${money(fees.paid)} paid of ${money(fees.billed)} billed.`} footer={<LinkText label="Open fees" onPress={() => go('fees')} />}>
                <ProgressBar value={paidPct} tone="success" />
                <View style={{ height: 10 }} />
                {[
                  { label: 'Outstanding', value: money(fees.outstanding), bad: fees.outstanding > 0 },
                  { label: 'Overdue', value: money(fees.overdueAmount), bad: fees.overdueAmount > 0 },
                  ...fees.unpaid.slice(0, 3).map((f: any) => ({ label: `${f.fee_type} due ${dateLabel(f.due)}`, value: money(f.balance), bad: false })),
                ].map((r, i, a) => (
                  <Row key={r.label} last={i === a.length - 1} title={r.label} right={<Text style={{ color: r.bad ? c.danger : c.text, fontWeight: '700' }}>{r.value}</Text>} />
                ))}
              </ChartCard>

              <ChartCard compact title="Recent payments" footer={<LinkText label="All payments" onPress={() => go('fees')} />}>
                {payments.length === 0 ? <EmptyState text="No payments recorded yet." icon="wallet-outline" /> : payments.map((p: any, i: number) => (
                  <Row key={p.id} last={i === payments.length - 1} title={`${money(p.amount)} · ${p.fee_type}`} subtitle={`${dateLabel(p.date)}${p.method ? ` · ${p.method}` : ''}`}
                    right={<Pressable onPress={() => downloadAndShare(`/payments/${p.id}/receipt`, `payment-receipt-${p.id}.pdf`)} accessibilityLabel="Download receipt" style={{ padding: 8, borderRadius: 10, backgroundColor: c.primarySoft }}><Ionicons name="download-outline" size={18} color={c.primary} /></Pressable>} />
                ))}
              </ChartCard>

              <ChartCard compact title="Campus board" footer={<LinkText label="Open notices" onPress={() => go('notices')} />}>
                {notices.length === 0 ? <EmptyState text="No recent notices." icon="notifications-outline" /> : notices.map((n: any, i: number) => (
                  <Row key={n.id} last={i === notices.length - 1} title={n.title} subtitle={`${n.date}${n.type ? ` · ${n.type}` : ''}`} onPress={() => setViewing(n)} />
                ))}
              </ChartCard>

              <ChartCard compact title="Hostel" footer={hostel ? <LinkText label="Open hostel" onPress={() => go('hostel')} /> : undefined}>
                {hostel ? (
                  <>
                    <Row title="Hostel" right={<Text style={{ color: c.text, fontWeight: '700' }}>{hostel.name}</Text>} />
                    {hostel.block ? <Row title="Block" right={<Text style={{ color: c.text, fontWeight: '700' }}>{hostel.block}</Text>} /> : null}
                    <Row last title="Room" right={<Text style={{ color: c.text, fontWeight: '700' }}>{hostel.room}</Text>} />
                  </>
                ) : <EmptyState text={`${parent ? `${subject} has` : 'You have'} no hostel room allotted.`} icon="business-outline" />}
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
