import React, { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

export const relativeTime = (iso?: string | null) => {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const minutes = Math.floor((Date.now() - then.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  try { return then.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }); } catch { return then.toDateString(); }
};

export const fullDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try { return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }); } catch { return d.toString(); }
};

export const timeOf = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }); } catch { return ''; }
};

export const dayLabel = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }); } catch { return ''; }
};

export const initials = (name?: string | null) =>
  String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

export const fileDisplayName = (url?: string | null) => {
  const raw = String(url || '').split('/').pop() || '';
  const match = raw.match(/^\d+-\d+-(.+)$/);
  if (match) return match[1];
  const ext = (raw.match(/\.[A-Za-z0-9]+$/) || [''])[0];
  return `Attachment${ext}`;
};

export function Avatar({ name, size = 42 }: { name?: string | null; size?: number }) {
  const { c } = useAppTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: size * 0.34 }}>{initials(name)}</Text>
    </View>
  );
}

export function FilterChips<V extends string>({ options, value, onChange }: { options: { value: V; label: string; count?: number }[]; value: V; onChange: (v: V) => void }) {
  const { c } = useAppTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#ffffff' : c.muted }}>
              {o.label}{o.count !== undefined ? ` ${o.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const digits = (v: any) => String(v || '').replace(/\D/g, '');
const waNumber = (v: any) => { const d = digits(v); return d.length === 10 ? `91${d}` : d; };

function ContactChip({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { c } = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: c.primarySoft, maxWidth: '100%' }}>
      <Ionicons name={icon} size={14} color={c.primary} />
      <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const open = (url: string) => { Linking.openURL(url).catch(() => {}); };

// Tap to call, WhatsApp or email.
export function ContactLinks({ phone, whatsapp, email }: { phone?: string | null; whatsapp?: string | null; email?: string | null }) {
  const { c } = useAppTheme();
  if (!phone && !whatsapp && !email) return <Text style={{ color: c.faint, fontSize: 12 }}>No contact details on file</Text>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {phone ? <ContactChip icon="call-outline" label={phone} onPress={() => open(`tel:${String(phone).replace(/[^\d+]/g, '')}`)} /> : null}
      {whatsapp ? <ContactChip icon="logo-whatsapp" label={`WhatsApp ${whatsapp}`} onPress={() => open(`https://wa.me/${waNumber(whatsapp)}`)} /> : null}
      {email ? <ContactChip icon="mail-outline" label={email} onPress={() => open(`mailto:${email}`)} /> : null}
    </View>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { c } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12 }}>
      <Ionicons name="search" size={16} color={c.faint} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.faint} autoCapitalize="none" autoCorrect={false}
        style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: c.text }} accessibilityLabel={placeholder} />
      {value ? <Pressable onPress={() => onChange('')} hitSlop={8}><Ionicons name="close-circle" size={16} color={c.faint} /></Pressable> : null}
    </View>
  );
}

export function Dot({ color }: { color: string }) {
  return <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />;
}

export const Stack = ({ children, gap = 12 }: { children: ReactNode; gap?: number }) => <View style={{ gap }}>{children}</View>;
