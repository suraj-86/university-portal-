import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { Badge, Card, EmptyState, Gate, Screen, SelectField, T, useLoad } from '@/components/ui';
import { FilterChips } from './sharedBits';
import { MonthHeader, rangeText, todayISO, yearOptions } from './calendarBits';

type Ev = { id: number; title: string; type: string; start_date: string; end_date: string | null; description: string | null };
const TYPES = ['Semester Start', 'Semester End', 'Examination', 'Result', 'Event', 'Deadline', 'Other'];
const TONE: Record<string, 'success' | 'neutral' | 'danger' | 'info' | 'warn'> = {
  'Semester Start': 'success', 'Semester End': 'neutral', Examination: 'danger', Result: 'info', Event: 'info', Deadline: 'warn', Other: 'neutral',
};

export default function AcademicCalendar() {
  const { c } = useAppTheme();
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState('All');
  const load = useLoad([`/academic-events?year=${year}`]);
  const today = todayISO();

  const groups = useMemo(() => {
    const items: Ev[] = (load.data?.[0] as Ev[]) || [];
    const map = new Map<string, Ev[]>();
    items.filter((e) => type === 'All' || e.type === type).forEach((e) => {
      const k = e.start_date.slice(0, 7);
      map.set(k, [...(map.get(k) || []), e]);
    });
    return [...map.entries()];
  }, [load.data, type]);

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      <SelectField label="Year" value={year} options={yearOptions()} onChange={(v) => setYear(Number(v))} />
      <FilterChips value={type} onChange={setType} options={[{ value: 'All', label: 'All' }, ...TYPES.map((t) => ({ value: t, label: t }))]} />
      <Gate load={load} cards={3}>
        {() => groups.length === 0 ? <EmptyState text={type === 'All' ? `No events are published for ${year}.` : `No ${type.toLowerCase()} events in ${year}.`} icon="calendar-outline" /> : (
          <>
            {groups.map(([month, list]) => (
              <View key={month} style={{ gap: 10 }}>
                <MonthHeader ym={month} />
                {list.map((e) => {
                  const end = e.end_date || e.start_date;
                  const live = e.start_date <= today && today <= end;
                  const past = end < today;
                  return (
                    <Card key={e.id} style={[live ? { borderColor: c.accent } : null, past ? { opacity: 0.6 } : null]}>
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Badge label={e.type} tone={TONE[e.type] || 'neutral'} />
                          {live ? <Badge label="Happening now" tone="success" /> : null}
                        </View>
                        <T v="h2">{e.title}</T>
                        <T v="small">{rangeText(e.start_date, e.end_date)}</T>
                        {e.description ? <T v="muted">{e.description}</T> : null}
                      </View>
                    </Card>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </Gate>
    </Screen>
  );
}
