import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useInbox } from '@/context/InboxContext';
import { useWards } from '@/context/WardContext';
import { Badge, Button, Card, EmptyState, Gate, Screen, SelectField, Sheet, T, useLoad } from '@/components/ui';
import api, { getFileUrl } from '@/services/api';
import { Avatar, FilterChips, SearchBox, fileDisplayName, fullDateTime, relativeTime } from './sharedBits';

type Notice = {
  id: number; title: string; content: string; priority?: string; attachment_url?: string | null; target_role?: string;
  created_at: string; author_name?: string; author_role?: string; subject_name?: string | null; is_read: boolean; is_personal: boolean;
};

type Filter = 'all' | 'unread' | 'personal' | 'faculty' | 'admin' | 'high';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }, { value: 'personal', label: 'For you' },
  { value: 'faculty', label: 'Faculty' }, { value: 'admin', label: 'Administration' }, { value: 'high', label: 'High priority' },
];

const matches = (n: Notice, f: Filter) => {
  switch (f) {
    case 'unread': return !n.is_read;
    case 'personal': return n.is_personal;
    case 'faculty': return n.author_role === 'teacher';
    case 'admin': return n.author_role !== 'teacher';
    case 'high': return n.priority === 'High';
    default: return true;
  }
};

const sourceOf = (n: Notice) => (n.is_personal ? 'For you' : n.author_role === 'teacher' ? 'Faculty' : 'Administration');

// Notices for students, parents (per child or all) and teachers.
export default function Notices() {
  const { c } = useAppTheme();
  const { user } = useAuth();
  const { refresh: refreshInbox } = useInbox();
  const { wards } = useWards();
  const isParent = user?.role === 'parent';
  const [wardId, setWardId] = useState<string>('');
  const url = isParent && wardId ? `/notices/feed?student_id=${wardId}` : '/notices/feed';
  const load = useLoad([url]);

  const [readIds, setReadIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Notice | null>(null);

  const items: Notice[] = useMemo(
    () => ((load.data?.[0] as Notice[]) || []).map((n) => (readIds.includes(n.id) ? { ...n, is_read: true } : n)),
    [load.data, readIds],
  );
  const unread = items.filter((n) => !n.is_read);

  const markRead = async (ids: number[]) => {
    if (!ids.length) return;
    setReadIds((cur) => [...new Set([...cur, ...ids])]);
    try { await api.post('/notices/read', { ids }); refreshInbox(); } catch { /* the badge corrects itself on the next refresh */ }
  };

  const open = (n: Notice) => { setActive(n); if (!n.is_read) markRead([n.id]); };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => matches(n, filter) && (!q || n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) || (n.author_name || '').toLowerCase().includes(q)));
  }, [items, filter, query]);

  const openAttachment = (u: string) => {
    const link = getFileUrl(u);
    if (link) Linking.openURL(link).catch(() => Alert.alert('Could not open the attachment', 'Please try again.'));
  };

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      {isParent && wards.length > 1 ? (
        <SelectField label="Notices for" value={wardId} onChange={(v) => setWardId(String(v))}
          options={[{ value: '', label: 'All my children' }, ...wards.map((w) => ({ value: String(w.student_id), label: w.full_name }))]} />
      ) : null}

      <Gate load={load} cards={4}>
        {() => (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T v="muted">{unread.length > 0 ? `${unread.length} unread` : 'You are all caught up.'}</T>
              {unread.length > 0 ? (
                <Pressable onPress={() => markRead(unread.slice(0, 200).map((n) => n.id))} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-done" size={16} color={c.success} />
                  <Text style={{ color: c.success, fontWeight: '700', fontSize: 13 }}>Mark all read</Text>
                </Pressable>
              ) : null}
            </View>
            <SearchBox value={query} onChange={setQuery} placeholder="Search notices" />
            <FilterChips options={FILTERS.map((f) => ({ ...f, count: items.filter((n) => matches(n, f.value)).length }))} value={filter} onChange={setFilter} />

            {visible.length === 0 ? (
              <Card><EmptyState text={items.length === 0 ? 'No notices yet.' : 'No notices match your filters.'} icon="megaphone-outline" /></Card>
            ) : visible.map((n) => {
              const high = n.priority === 'High';
              return (
                <Card key={n.id} onPress={() => open(n)} style={{ borderColor: n.is_read ? c.border : c.primary, borderLeftWidth: 4, borderLeftColor: high ? c.danger : c.primary }}>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                      <Badge label={sourceOf(n)} tone={n.is_personal ? 'info' : 'neutral'} />
                      {high ? <Badge label="High priority" tone="danger" /> : null}
                      {n.subject_name ? <Badge label={n.subject_name} /> : null}
                      <View style={{ flex: 1 }} />
                      <T v="small">{relativeTime(n.created_at)}</T>
                      {!n.is_read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary }} /> : null}
                    </View>
                    <Text style={{ color: c.text, fontSize: 16, lineHeight: 21, fontWeight: n.is_read ? '700' : '800' }}>{n.title}</Text>
                    <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>{n.content}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Avatar name={n.author_name} size={26} />
                      <T v="small" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{n.author_role === 'admin' ? 'Administration' : n.author_name}</T>
                      {n.attachment_url ? <Ionicons name="attach" size={16} color={c.primary} /> : null}
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </Gate>

      <Sheet visible={!!active} title={active?.title || ''} onClose={() => setActive(null)}>
        {active ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Badge label={sourceOf(active)} tone={active.is_personal ? 'info' : 'neutral'} />
              {active.priority === 'High' ? <Badge label="High priority" tone="danger" /> : null}
              {active.subject_name ? <Badge label={active.subject_name} /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={active.author_name} size={36} />
              <View>
                <T v="body" style={{ fontWeight: '700' }}>{active.author_role === 'admin' ? 'Administration' : active.author_name}</T>
                <T v="small">{fullDateTime(active.created_at)}</T>
              </View>
            </View>
            <T v="body" selectable>{active.content}</T>
            {active.attachment_url ? (
              <Card>
                <View style={{ gap: 10 }}>
                  <T v="label">Attachment</T>
                  <T v="body" style={{ fontWeight: '700' }} numberOfLines={2}>{fileDisplayName(active.attachment_url)}</T>
                  <Button label="Open attachment" icon="download-outline" variant="soft" onPress={() => openAttachment(active.attachment_url as string)} />
                </View>
              </Card>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
