import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { Card, EmptyState, Gate, Notice, Screen, SelectField, T, useLoad } from '@/components/ui';
import { MonthHeader, daysBetween, shortDate, todayISO, yearOptions } from './calendarBits';

type Holiday = { id: number; date: string; name: string; description: string | null };

export default function Holidays() {
  const { c } = useAppTheme();
  const [year, setYear] = useState(new Date().getFullYear());
  const load = useLoad([`/holidays?year=${year}`]);
  const today = todayISO();

  const { groups, next } = useMemo(() => {
    const items: Holiday[] = (load.data?.[0] as Holiday[]) || [];
    const map = new Map<string, Holiday[]>();
    items.forEach((h) => { const k = h.date.slice(0, 7); map.set(k, [...(map.get(k) || []), h]); });
    return { groups: [...map.entries()], next: items.find((h) => h.date >= today) || null };
  }, [load.data, today]);

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      <SelectField label="Year" value={year} options={yearOptions()} onChange={(v) => setYear(Number(v))} />
      <Gate load={load} cards={3}>
        {() => groups.length === 0 ? <EmptyState text={`No holidays are published for ${year}.`} icon="sunny-outline" /> : (
          <>
            {next ? (
              <Notice tone="info">
                Next holiday: {next.name}, {shortDate(next.date)}{(() => { const d = daysBetween(today, next.date); return d === 0 ? ' (today)' : d === 1 ? ' (tomorrow)' : ` (in ${d} days)`; })()}
              </Notice>
            ) : null}
            {groups.map(([month, list]) => (
              <View key={month} style={{ gap: 10 }}>
                <MonthHeader ym={month} />
                {list.map((h) => (
                  <Card key={h.id} style={h.date < today ? { opacity: 0.6 } : h.date === today ? { borderColor: c.accent } : undefined}>
                    <T v="h2">{h.name}</T>
                    <T v="small">{shortDate(h.date)}</T>
                    {h.description ? <T v="muted" style={{ marginTop: 4 }}>{h.description}</T> : null}
                  </Card>
                ))}
              </View>
            ))}
          </>
        )}
      </Gate>
    </Screen>
  );
}
