import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/AppText';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import WardScreen from '@/components/WardScreen';
import { Badge, Card, EmptyState, Gate, Screen, T, useLoad } from '@/components/ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

type Slot = {
  id: number; day: string; start_time: string; end_time: string; room?: string | null;
  subject_code?: string; subject_name: string; semester?: number; course_code?: string; course_name?: string; faculty?: string | null;
};

const fmtTime = (hhmm: string) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const todayName = () => {
  try {
    const name = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
    return DAYS.includes(name) ? name : null;
  } catch {
    const i = new Date().getDay();
    return i >= 1 && i <= 5 ? DAYS[i - 1] : null;
  }
};

function SlotRow({ s, teacher, last }: { s: Slot; teacher: boolean; last: boolean }) {
  const { c } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <View style={{ width: 78 }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>{fmtTime(s.start_time)}</Text>
        <T v="small">{fmtTime(s.end_time)}</T>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{s.subject_name}</Text>
        {teacher
          ? <T v="small">{[s.course_code, s.semester ? `Sem ${s.semester}` : null].filter(Boolean).join(' · ')}</T>
          : <T v="small">{s.faculty || 'Faculty not assigned'}</T>}
        <T v="small">{s.room ? `Room ${s.room}` : 'Room to be announced'}</T>
      </View>
      {s.subject_code ? <Badge label={s.subject_code} /> : null}
    </View>
  );
}

function TimetableBody({ url, teacher, top, ward }: { url: string; teacher: boolean; top?: React.ReactNode; ward?: string }) {
  const { c } = useAppTheme();
  const load = useLoad([url]);
  const today = todayName();

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {top}
      <Gate load={load} cards={3}>
        {([data]) => {
          const slots: Slot[] = Array.isArray(data) ? data : [];
          const first = slots[0];
          const subtitle = teacher
            ? 'Your classes across all assigned courses and semesters.'
            : first ? `${first.course_name} · Semester ${first.semester}${ward ? ` · ${ward}` : ''}` : 'Your semester timetable.';
          const byDay: Record<string, Slot[]> = Object.fromEntries(DAYS.map((d) => [d, []]));
          slots.forEach((s) => { if (byDay[s.day]) byDay[s.day].push(s); });
          DAYS.forEach((d) => byDay[d].sort((a, b) => a.start_time.localeCompare(b.start_time)));

          return (
            <>
              <T v="muted">{subtitle}</T>
              {slots.length === 0 ? (
                <Card><EmptyState icon="time-outline" text={teacher ? 'No timetable entries for your subjects yet.' : 'The timetable has not been published for this semester yet.'} /></Card>
              ) : DAYS.map((d) => {
                const isToday = d === today;
                const list = byDay[d];
                return (
                  <Card key={d} pad={false} style={isToday ? { borderColor: c.accent, borderWidth: 2 } : undefined}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 6 }}>
                      <T v="h2">{d}</T>
                      {isToday ? <Badge label="Today" tone="info" /> : null}
                    </View>
                    <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
                      {list.length === 0
                        ? <T v="small" style={{ paddingVertical: 10 }}>No classes.</T>
                        : list.map((s, i) => <SlotRow key={s.id} s={s} teacher={teacher} last={i === list.length - 1} />)}
                    </View>
                  </Card>
                );
              })}
            </>
          );
        }}
      </Gate>
    </Screen>
  );
}

export default function Timetable() {
  const { user } = useAuth();
  const role = user?.role;
  if (!user) return null;
  if (role === 'teacher') return <TimetableBody url={`/teacher/${user.id}/timetable`} teacher />;
  if (role === 'student') return <TimetableBody url={`/student/${user.id}/timetable`} teacher={false} />;
  return (
    <WardScreen>
      {(t) => <TimetableBody key={t.studentUserId} url={`/student/${t.studentUserId}/timetable`} teacher={false} top={t.top} ward={t.subject} />}
    </WardScreen>
  );
}
