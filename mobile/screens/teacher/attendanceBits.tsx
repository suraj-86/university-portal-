import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { useAppTheme } from '@/context/ThemeContext';
import { B, Badge, Card, ChartCard, EmptyState, Gate, LinkText, Row, SelectField, Sheet, T, useLoad } from '@/components/ui';
import { dateLabel, plural } from '@/lib/format';

export type Status = 'Present' | 'Absent' | 'Late' | 'Excused';
export const STATUSES: { value: Status; short: string; tone: 'success' | 'danger' | 'warn' | 'info' }[] = [
  { value: 'Present', short: 'P', tone: 'success' },
  { value: 'Absent', short: 'A', tone: 'danger' },
  { value: 'Late', short: 'L', tone: 'warn' },
  { value: 'Excused', short: 'E', tone: 'info' },
];
export const toneOf = (s: string): 'success' | 'danger' | 'warn' | 'info' | 'neutral' =>
  STATUSES.find((x) => x.value === s)?.tone ?? 'neutral';

export type Student = { student_id: number; roll?: string | number | null; name?: string | null; status: Status };

export const countBy = (rows: { status: string }[]) => {
  const n = { Present: 0, Absent: 0, Late: 0, Excused: 0 } as Record<Status, number>;
  rows.forEach((r) => { if (r.status in n) n[r.status as Status] += 1; });
  return n;
};

export const countsLine = (n: Record<Status, number>) =>
  [`${n.Present} present`, `${n.Absent} absent`, n.Late ? `${n.Late} late` : '', n.Excused ? `${n.Excused} excused` : ''].filter(Boolean).join(' · ');

/** Compact P / A / L / E chips for one student. */
export function StatusChips({ value, onChange, name }: { value: Status; onChange: (s: Status) => void; name: string }) {
  const { c } = useAppTheme();
  const colour = (t: string) => ({ success: [c.success, c.successSoft], danger: [c.danger, c.dangerSoft], warn: [c.warn, c.warnSoft], info: [c.primary, c.primarySoft] } as Record<string, string[]>)[t];
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {STATUSES.map((s) => {
        const on = s.value === value;
        const [fg, bg] = colour(s.tone);
        return (
          <Pressable key={s.value} onPress={() => onChange(s.value)} hitSlop={4} accessibilityRole="radio" accessibilityLabel={`${name}: ${s.value}`} accessibilityState={{ selected: on }}
            style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? bg : c.surfaceAlt, borderWidth: 1.5, borderColor: on ? fg : c.border }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: on ? fg : c.faint }}>{s.short}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- history ---------- */
type HistoryRecord = { id: number; date: string; class: string; semester: string; subject: string; present: number | string; absent: number | string };
const PAGE = 20;

function SheetDetail({ record, onClose }: { record: HistoryRecord | null; onClose: () => void }) {
  const load = useLoad(record ? [`/attendance/class/${record.id}`] : null);
  return (
    <Sheet visible={!!record} title={record ? `${record.subject} · ${dateLabel(record.date)}` : ''} onClose={onClose}>
      {record ? (
        <Gate load={load} cards={3}>
          {(d) => {
            const rows: { roll?: string; name?: string; status: string }[] = Array.isArray(d[0]) ? d[0] : [];
            return rows.length === 0 ? <EmptyState text="No students were recorded for this class." /> : (
              <>
                <T v="muted"><B>{record.class}</B> · {record.semester} · {countsLine(countBy(rows as any))}</T>
                <Card pad={false} style={{ paddingHorizontal: 14 }}>
                  {rows.map((r, i) => (
                    <Row key={`${r.roll}-${i}`} last={i === rows.length - 1} title={r.name || 'Student'} subtitle={r.roll ? `Roll ${r.roll}` : undefined} right={<Badge label={r.status} tone={toneOf(r.status)} />} />
                  ))}
                </Card>
                <T v="small">Past sheets are read-only. Attendance can only be edited on the day of the class.</T>
              </>
            );
          }}
        </Gate>
      ) : null}
    </Sheet>
  );
}

export function AttendanceHistory({ teacherId, semesters, onRefreshRef }: { teacherId: number; semesters: number[]; onRefreshRef?: (fn: () => void) => void }) {
  const load = useLoad([`/teacher/${teacherId}/attendance-history`]);
  const [semester, setSemester] = useState('All');
  const [subject, setSubject] = useState('All');
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<HistoryRecord | null>(null);
  onRefreshRef?.(load.refresh);

  const records: HistoryRecord[] = useMemo(() => (Array.isArray(load.data?.[0]) ? load.data![0] : []), [load.data]);
  const subjects = useMemo(() => [...new Set(records.filter((r) => semester === 'All' || r.semester === semester).map((r) => r.subject))].sort(), [records, semester]);
  const filtered = records.filter((r) => (semester === 'All' || r.semester === semester) && (subject === 'All' || r.subject === subject));
  const present = filtered.reduce((s, r) => s + Number(r.present || 0), 0);
  const absent = filtered.reduce((s, r) => s + Number(r.absent || 0), 0);

  return (
    <Gate load={load} cards={3}>
      {() => (
        <>
          <SelectField label="Semester" value={semester} options={[{ value: 'All', label: 'All semesters' }, ...semesters.map((s) => ({ value: `Sem ${s}`, label: `Semester ${s}` }))]} onChange={(v) => { setSemester(String(v)); setSubject('All'); setShown(PAGE); }} />
          <SelectField label="Subject" value={subject} options={[{ value: 'All', label: 'All subjects' }, ...subjects.map((s) => ({ value: s, label: s }))]} onChange={(v) => { setSubject(String(v)); setShown(PAGE); }} />
          <ChartCard title="Attendance sheets" hint={filtered.length ? `${plural(filtered.length, 'sheet')} · ${present} present · ${absent} absent in total. Tap a sheet to view it.` : undefined}>
            {filtered.length === 0 ? <EmptyState text="No attendance sheets match these filters." icon="calendar-outline" /> : (
              <>
                {filtered.slice(0, shown).map((r, i) => (
                  <Row key={r.id} last={i === Math.min(shown, filtered.length) - 1} title={r.subject} subtitle={`${dateLabel(r.date)} · ${r.class} (${r.semester})`} onPress={() => setOpen(r)}
                    right={<View style={{ alignItems: 'flex-end', gap: 4 }}><Badge label={`${r.present} present`} tone="success" /><Badge label={`${r.absent} absent`} tone="danger" /></View>} />
                ))}
                {filtered.length > shown ? <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><LinkText label={`Show more (${filtered.length - shown} left)`} onPress={() => setShown((n) => n + PAGE)} /></View> : null}
              </>
            )}
          </ChartCard>
          <SheetDetail record={open} onClose={() => setOpen(null)} />
        </>
      )}
    </Gate>
  );
}
