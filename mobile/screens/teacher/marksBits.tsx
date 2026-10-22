import React, { memo, ReactNode, useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { radius } from '@/constants/theme';
import { Badge, EmptyState, Notice, Sheet, T } from '@/components/ui';
import api, { errorMessage } from '@/services/api';

/* ---------- business constants (same as the web page) ---------- */
export const PASS_PERCENT = 40;
export const STANDARD_TYPES = ['Assignment', 'Sessional 1', 'Sessional 2', 'End Sem'] as const;
export const DEFAULT_LABELS: Record<string, string> = { 'Assignment': 'Assignment', 'Sessional 1': 'Sessional 1', 'Sessional 2': 'Sessional 2', 'End Sem': 'End Semester Exam' };
export const DEFAULT_MAX: Record<string, number> = { 'Assignment': 10, 'Sessional 1': 10, 'Sessional 2': 10, 'End Sem': 70 };

export type Subject = { id: number; subject_code?: string; subject_name: string; course_name?: string; semester: number; enrolled_count?: number };
export type Student = { id: number; name: string; roll: string };
export type LedgerRow = { classId: number; type: string; name: string; display_name?: string | null; date: string; subject: string; semester: number; course: string; max: number; avg: number; status: string };
export type Summary = {
  entered: Student[]; changes: Student[]; created: Student[]; maxChanged: boolean; notEntered: number;
  stats: { count: number; avg: number; avgPct: number; highest: number; lowest: number; passed: number; failed: number; passRate: number };
};

export const q = encodeURIComponent;

/** Web rule: a score is a number from 0 to max with at most 2 decimals. Returns the cleaned text, or null when the keystroke must be refused. */
export function cleanScoreText(raw: string, max: number): { text: string | null; over: boolean } {
  let t = raw.replace(',', '.').trim();
  if (t === '') return { text: '', over: false };
  if (t === '.') t = '0.';
  if (!/^\d*\.?\d{0,2}$/.test(t)) return { text: null, over: false };
  const n = Number(t);
  if (!Number.isFinite(n)) return { text: null, over: false };
  if (n > max) return { text: null, over: true };
  return { text: t, over: false };
}

export const isEntered = (t: string | undefined) => t !== undefined && t !== '' && Number.isFinite(Number(t));

export function computeStats(scores: number[], max: number): Summary['stats'] {
  const count = scores.length;
  const avg = count ? scores.reduce((a, b) => a + b, 0) / count : 0;
  const passed = scores.filter((n) => (n / max) * 100 >= PASS_PERCENT).length;
  return {
    count, avg, avgPct: max ? (avg / max) * 100 : 0,
    highest: count ? Math.max(...scores) : 0, lowest: count ? Math.min(...scores) : 0,
    passed, failed: count - passed, passRate: count ? (passed / count) * 100 : 0,
  };
}

export const validMax = (n: number) => Number.isInteger(n) && n >= 1 && n <= 999;
export const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ');

export const whenLabel = (v: any) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  try { return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d.toDateString(); }
};

/* ---------- small views ---------- */
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { c } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 12 }}>
      <Ionicons name="search" size={16} color={c.faint} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.faint} autoCapitalize="none" autoCorrect={false}
        style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: c.text }} accessibilityLabel={placeholder} />
      {value ? <Pressable onPress={() => onChange('')} hitSlop={8}><Ionicons name="close-circle" size={16} color={c.faint} /></Pressable> : null}
    </View>
  );
}

export function StatTile({ label, value, sub, tone = 'neutral' }: { label: string; value: string | number; sub?: string; tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'info' }) {
  const { c } = useAppTheme();
  const map = { neutral: [c.surfaceAlt, c.text], success: [c.successSoft, c.success], warn: [c.warnSoft, c.warn], danger: [c.dangerSoft, c.danger], info: [c.primarySoft, c.primary] }[tone];
  return (
    <View style={{ flex: 1, backgroundColor: map[0], borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' }}>
      <Text style={{ color: map[1], fontSize: 18, fontWeight: '700' }}>{value}</Text>
      {sub ? <Text style={{ color: map[1], fontSize: 10, fontWeight: '700', opacity: 0.8 }}>{sub}</Text> : null}
      <Text style={{ color: map[1], fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

type RowProps = { id: number; name: string; roll: string; value: string; max: number; saved: boolean; hint: boolean; onChange: (id: number, v: string) => void };

export const ScoreRow = memo(function ScoreRow({ id, name, roll, value, max, saved, hint, onChange }: RowProps) {
  const { c } = useAppTheme();
  const filled = isEntered(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={{ flex: 1 }}>
        <T v="body" style={{ fontWeight: '700' }} numberOfLines={1}>{name}</T>
        <T v="small" numberOfLines={1}>{roll || 'No roll no.'}{saved ? ' · saved' : ''}</T>
        {hint ? <Text style={{ color: c.danger, fontSize: 11, fontWeight: '700' }}>Cannot be above {max}</Text> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(id, t)}
        keyboardType="decimal-pad"
        placeholder="Absent"
        placeholderTextColor={c.faint}
        maxLength={6}
        selectTextOnFocus
        accessibilityLabel={`Marks for ${name}`}
        style={{ width: 80, textAlign: 'center', fontSize: 16, fontWeight: '700', color: c.text, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: hint ? c.danger : filled ? c.primary : c.border, borderRadius: radius.sm, paddingVertical: 8 }}
      />
      <T v="small" style={{ width: 38 }}>/ {max}</T>
    </View>
  );
});

/* ---------- change history sheet (used by the entry flow and the ledger) ---------- */
type HistoryRow = { id: number; roll: string | null; name: string; old_score: number | null; new_score: number; old_max: number | null; new_max: number; changed_by: string | null; reason: string | null; changed_at: string };

export function useHistory() {
  const { c } = useAppTheme();
  const [state, setState] = useState<{ title: string; rows: HistoryRow[] | null; error: string | null } | null>(null);

  const open = useCallback(async (classId: number | string, type: string, name: string, title: string) => {
    setState({ title, rows: null, error: null });
    try {
      const res = await api.get(`/marks/history?subject_id=${classId}&exam_type=${q(type)}&assessment_name=${q(name || '')}`);
      setState({ title, rows: Array.isArray(res.data) ? res.data : [], error: null });
    } catch (e) {
      setState({ title, rows: null, error: errorMessage(e, 'Failed to load the change history.') });
    }
  }, []);

  const sheet: ReactNode = (
    <Sheet visible={!!state} title={state?.title || ''} onClose={() => setState(null)}>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state && !state.rows && !state.error ? <T v="muted">Loading history…</T> : null}
      {state?.rows && state.rows.length === 0 ? <EmptyState icon="time-outline" text="No changes have been recorded yet." /> : null}
      {state?.rows?.map((r) => (
        <View key={r.id} style={{ gap: 3, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T v="body" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{r.name}</T>
            <T v="small">{whenLabel(r.changed_at)}</T>
          </View>
          <T v="small">{r.roll || 'No roll no.'}</T>
          {r.old_score === null
            ? <Text style={{ color: c.success, fontWeight: '700', fontSize: 14 }}>Entered {Number(r.new_score)} / {r.new_max}</Text>
            : <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{Number(r.old_score)} → {Number(r.new_score)} <Text style={{ color: c.muted, fontWeight: '600', fontSize: 12 }}>/ {r.new_max}</Text></Text>}
          <T v="small">By {r.changed_by || 'Unknown'}{r.reason ? ` · ${r.reason}` : ''}</T>
        </View>
      ))}
    </Sheet>
  );
  return { open, sheet };
}

export function PassBadge({ pct }: { pct: number }) {
  return <Badge label={`${Math.round(pct)}%`} tone={pct >= 75 ? 'success' : pct >= PASS_PERCENT ? 'warn' : 'danger'} />;
}
