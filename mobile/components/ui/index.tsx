import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleProp, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { Text, TextInput } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { radius } from '@/constants/theme';
import { greeting, todayLabel } from '@/lib/format';

export { default as useLoad } from '@/hooks/useLoad';
export * from './charts';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info';

export const useTone = () => {
  const { c } = useAppTheme();
  return (t: Tone) => ({
    neutral: { fg: c.muted, bg: c.surfaceAlt },
    success: { fg: c.success, bg: c.successSoft },
    warn: { fg: c.warn, bg: c.warnSoft },
    danger: { fg: c.danger, bg: c.dangerSoft },
    info: { fg: c.primary, bg: c.primarySoft },
  }[t]);
};

/* ---------- text ---------- */
type Variant = 'title' | 'h2' | 'body' | 'small' | 'label' | 'muted';
export function T({ v = 'body', style, children, ...rest }: { v?: Variant; style?: StyleProp<TextStyle>; children?: ReactNode } & React.ComponentProps<typeof Text>) {
  const { c } = useAppTheme();
  const base: Record<Variant, TextStyle> = {
    title: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
    h2: { fontSize: 15, fontWeight: '700', color: c.text },
    body: { fontSize: 14, color: c.text, lineHeight: 20 },
    small: { fontSize: 12, color: c.muted, lineHeight: 17 },
    muted: { fontSize: 14, color: c.muted, lineHeight: 20 },
    label: { fontSize: 11, fontWeight: '700', color: c.muted, letterSpacing: 1, textTransform: 'uppercase' },
  };
  return <Text {...rest} style={[base[v], style]}>{children}</Text>;
}

/* ---------- layout ---------- */
export function Screen({ children, onRefresh, refreshing = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  const { c } = useAppTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 130, gap: 12 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress, pad = true }: { children?: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; pad?: boolean }) {
  const { c } = useAppTheme();
  const inner: StyleProp<ViewStyle> = [
    { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: pad ? 14 : 0, overflow: 'hidden' },
    style,
  ];
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [inner, pressed && { opacity: 0.85 }]}>{children}</Pressable>;
  return <View style={inner}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <T v="label" style={{ marginTop: 6, marginLeft: 2 }}>{children}</T>;
}

export function Divider() {
  const { c } = useAppTheme();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

/* ---------- buttons, badges, bars ---------- */
export function Button({ label, onPress, loading, disabled, variant = 'primary', icon }: {
  label: string; onPress?: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'soft' | 'danger'; icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { c } = useAppTheme();
  const bg = variant === 'primary' ? c.accent : variant === 'danger' ? c.dangerSoft : c.primarySoft;
  const fg = variant === 'primary' ? '#ffffff' : variant === 'danger' ? c.danger : c.primary;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ backgroundColor: bg, borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: off ? 0.55 : pressed ? 0.85 : 1 })}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useAppTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>{label} →</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = useTone()(tone);
  return (
    <View style={{ backgroundColor: t.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: t.fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, max = 100, tone = 'info', mark }: { value: number; max?: number; tone?: Tone; mark?: number }) {
  const { c } = useAppTheme();
  const t = useTone()(tone);
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'visible' }}>
      <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: t.fg }} />
      {mark !== undefined && <View style={{ position: 'absolute', left: `${Math.min(100, (mark / max) * 100)}%`, top: -2, width: 2, height: 12, backgroundColor: c.muted }} />}
    </View>
  );
}

export function Row({ title, subtitle, right, onPress, icon, last }: {
  title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap; last?: boolean;
}) {
  const { c } = useAppTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, opacity: pressed ? 0.7 : 1 })}>
      {icon && <Ionicons name={icon} size={20} color={c.accent} />}
      <View style={{ flex: 1 }}>
        <T v="body" style={{ fontWeight: '600' }}>{title}</T>
        {subtitle ? <T v="small">{subtitle}</T> : null}
      </View>
      {right}
    </Pressable>
  );
}

/* ---------- loading, empty, error ---------- */
export function Skeleton({ h = 16, w = '100%', r = 8 }: { h?: number; w?: number | `${number}%`; r?: number }) {
  const { c } = useAppTheme();
  const a = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.45, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={{ height: h, width: w, borderRadius: r, backgroundColor: c.surfaceAlt, opacity: a }} />;
}

export function LoadingBlock({ cards = 3 }: { cards?: number }) {
  return (
    <View style={{ gap: 14 }}>
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}><View style={{ gap: 10 }}><Skeleton h={18} w="45%" /><Skeleton h={12} /><Skeleton h={12} w="80%" /></View></Card>
      ))}
    </View>
  );
}

export function EmptyState({ text, icon = 'file-tray-outline' }: { text: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const { c } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
      <Ionicons name={icon} size={30} color={c.faint} />
      <T v="muted" style={{ textAlign: 'center' }}>{text}</T>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { c } = useAppTheme();
  return (
    <Card>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
        <Ionicons name="cloud-offline-outline" size={32} color={c.danger} />
        <T v="body" style={{ textAlign: 'center' }}>{message}</T>
        {onRetry ? <Button label="Try again" onPress={onRetry} variant="soft" icon="refresh" /> : null}
      </View>
    </Card>
  );
}

// Shows skeletons, then the error with a retry, then the page. Every data screen uses this.
export function Gate({ load, children, cards }: { load: { data: any[] | null; loading: boolean; error: string | null; reload: () => void }; children: (data: any[]) => ReactNode; cards?: number }) {
  if (load.loading && !load.data) return <LoadingBlock cards={cards} />;
  if (load.error && !load.data) return <ErrorState message={load.error} onRetry={load.reload} />;
  if (!load.data) return null;
  return <>{children(load.data)}</>;
}

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const t = useTone()(tone);
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: radius.md, padding: 12 }}>
      <Text style={{ color: t.fg, fontWeight: '700', fontSize: 13, lineHeight: 18 }}>{children}</Text>
    </View>
  );
}

/* ---------- inputs ---------- */
export function Field({ label, ...rest }: { label: string } & TextInputProps) {
  const { c } = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <TextInput
        placeholderTextColor={c.faint}
        {...rest}
        style={[{ backgroundColor: c.surfaceAlt, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text }, rest.style]}
      />
    </View>
  );
}

export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  const { c } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center', backgroundColor: on ? c.surface : 'transparent' }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: on ? c.primary : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SelectField({ label, value, options, onChange, placeholder = 'Select' }: {
  label?: string; value: string | number | null; options: { value: string | number; label: string }[]; onChange: (v: any) => void; placeholder?: string;
}) {
  const { c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => String(o.value) === String(value));
  return (
    <View style={{ gap: 6 }}>
      {label ? <T v="label">{label}</T> : null}
      <Pressable onPress={() => setOpen(true)} style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: current ? c.text : c.faint, fontSize: 14, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{current ? current.label : placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(8,16,31,0.55)', justifyContent: 'flex-end' }}>
          <Pressable style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '70%', paddingBottom: 24 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: c.border }}><T v="h2">{label || placeholder}</T></View>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => {
                const on = String(item.value) === String(value);
                return (
                  <Pressable onPress={() => { onChange(item.value); setOpen(false); }} style={{ paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: on ? c.primarySoft : 'transparent' }}>
                    <Text style={{ color: c.text, fontSize: 15, fontWeight: on ? '800' : '500', flexShrink: 1 }}>{item.label}</Text>
                    {on ? <Ionicons name="checkmark" size={20} color={c.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Sheet used for notice and message details.
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { c } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(8,16,31,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <T v="h2" style={{ flex: 1 }} numberOfLines={2}>{title}</T>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={c.muted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36, gap: 12 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- dashboard pieces ---------- */
export function DashHeader({ name, facts = [] }: { name: string; facts?: { label: string; onPress?: () => void }[] }) {
  const { c } = useAppTheme();
  return (
    <View style={{ backgroundColor: c.header, borderRadius: radius.xl, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border }}>
      <T v="small">{todayLabel()}</T>
      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginTop: 1 }} numberOfLines={2}>
        {greeting()}, <Text style={{ color: c.primary }}>{name}</Text>
      </Text>
      {facts.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 }}>
          {facts.map((f) => (
            <Pressable key={f.label} onPress={f.onPress} disabled={!f.onPress} style={{ backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: c.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export type Shortcut = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: number };

// Small shortcut cards for the most used pages, laid out in rows of three.
export function ShortcutRow({ items }: { items: Shortcut[] }) {
  const { c } = useAppTheme();
  const rows: Shortcut[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((it) => (
            <Pressable key={it.label} onPress={it.onPress} accessibilityRole="button" accessibilityLabel={it.label}
              style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, paddingHorizontal: 6, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.8 : 1 })}>
              <View>
                <Ionicons name={it.icon} size={19} color={c.primary} />
                {it.badge ? (
                  <View style={{ position: 'absolute', top: -7, right: -9, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 8, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{it.badge > 99 ? '99+' : it.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: c.text, fontSize: 12, fontWeight: '700', flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

export type AttentionItem = { key: string; tone: 'danger' | 'warn' | 'info'; text: ReactNode; action?: { label: string; onPress: () => void } };

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const { c } = useAppTheme();
  const tone = useTone();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 2);
  return (
    <Card pad={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14 }}>
        <T v="h2">Needs your attention</T>
        {items.length > 0 && <Badge label={`${items.length}`} tone="warn" />}
      </View>
      {items.length === 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surfaceAlt }}>
          <Ionicons name="checkmark-circle" size={16} color={c.success} />
          <T v="small">All clear right now.</T>
        </View>
      ) : shown.map((it) => (
        <Pressable key={it.key} onPress={it.action?.onPress} disabled={!it.action} accessibilityLabel={it.action?.label}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: c.border }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone(it.tone === 'info' ? 'info' : it.tone).fg }} />
          <Text style={{ flex: 1, color: c.text, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>{it.text}</Text>
          {it.action ? <Ionicons name="chevron-forward" size={16} color={c.muted} /> : null}
        </Pressable>
      ))}
      {items.length > 2 && (
        <Pressable onPress={() => setAll((v) => !v)} style={{ paddingVertical: 9, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surfaceAlt }}>
          <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>{all ? 'Show fewer' : `Show ${items.length - 2} more`}</Text>
        </Pressable>
      )}
    </Card>
  );
}
export function ChartCard({ title, hint, children, footer, compact }: { title: string; hint?: string; children: ReactNode; footer?: ReactNode; compact?: boolean }) {
  return (
    <Card style={compact ? { paddingVertical: 10, paddingHorizontal: 12 } : undefined}>
      <T v="h2">{title}</T>
      {hint ? <T v="small" style={{ marginTop: 1, marginBottom: compact ? 4 : 8 }}>{hint}</T> : <View style={{ height: compact ? 4 : 8 }} />}
      {children}
      {footer ? <View style={{ marginTop: compact ? 6 : 10 }}>{footer}</View> : null}
    </Card>
  );
}
export function B({ children }: { children: ReactNode }) {
  return <Text style={{ fontWeight: '700' }}>{children}</Text>;
}
