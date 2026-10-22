import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useInbox } from '@/context/InboxContext';
import { Badge, Card, EmptyState, Gate, Screen, T, useLoad } from '@/components/ui';
import api from '@/services/api';
import { FilterChips, SearchBox, fullDateTime, relativeTime } from './sharedBits';

type Announcement = {
  id: number; title: string; content: string; category: string; audience: string; course_id?: number | null; course_name?: string | null;
  semester?: number | null; priority?: string; pinned?: boolean; created_at: string; is_read: boolean;
};

const CATEGORIES = ['University', 'Department', 'Academic', 'Event', 'Other'];

export default function Announcements() {
  const { c } = useAppTheme();
  const { refresh: refreshInbox } = useInbox();
  const load = useLoad(['/announcements']);
  const [readIds, setReadIds] = useState<number[]>([]);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const items: Announcement[] = useMemo(
    () => ((load.data?.[0] as Announcement[]) || []).map((a) => (readIds.includes(a.id) ? { ...a, is_read: true } : a)),
    [load.data, readIds],
  );
  const unread = items.filter((a) => !a.is_read);

  const markRead = async (ids: number[]) => {
    if (!ids.length) return;
    setReadIds((cur) => [...new Set([...cur, ...ids])]);
    try { await api.post('/announcements/read', { ids }); refreshInbox(); } catch { /* corrected on the next refresh */ }
  };

  const toggle = (a: Announcement) => {
    const next = expanded === a.id ? null : a.id;
    setExpanded(next);
    if (next && !a.is_read) markRead([a.id]);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((a) => (category === 'All' || a.category === category) && (!q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)));
  }, [items, category, query]);

  const audienceText = (a: Announcement) => (a.course_id ? `${a.course_name || 'Course'}${a.semester ? ` · Sem ${a.semester}` : ''}` : '');

  return (
    <Screen onRefresh={load.refresh} refreshing={load.refreshing}>
      <Gate load={load} cards={4}>
        {() => (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T v="muted">{unread.length > 0 ? `${unread.length} unread` : 'You are all caught up.'}</T>
              {unread.length > 0 ? (
                <Pressable onPress={() => markRead(unread.slice(0, 200).map((a) => a.id))} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-done" size={16} color={c.success} />
                  <Text style={{ color: c.success, fontWeight: '700', fontSize: 13 }}>Mark all read</Text>
                </Pressable>
              ) : null}
            </View>
            <SearchBox value={query} onChange={setQuery} placeholder="Search announcements" />
            <FilterChips options={['All', ...CATEGORIES].map((x) => ({ value: x, label: x }))} value={category} onChange={setCategory} />

            {visible.length === 0 ? (
              <Card><EmptyState text={items.length === 0 ? 'No announcements yet.' : 'No announcements match your filters.'} icon="megaphone-outline" /></Card>
            ) : visible.map((a) => {
              const open = expanded === a.id;
              const high = a.priority === 'High';
              return (
                <Card key={a.id} onPress={() => toggle(a)} style={{ borderLeftWidth: 4, borderLeftColor: high ? c.danger : c.primary, borderColor: a.is_read ? c.border : c.primary }}>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                      {a.pinned ? <Badge label="Pinned" tone="warn" /> : null}
                      <Badge label={a.category} tone="info" />
                      {high ? <Badge label="Important" tone="danger" /> : null}
                      <View style={{ flex: 1 }} />
                      <T v="small">{relativeTime(a.created_at)}</T>
                      {!a.is_read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary }} /> : null}
                    </View>
                    <Text style={{ color: c.text, fontSize: 16, lineHeight: 21, fontWeight: a.is_read ? '500' : '700' }}>{a.title}</Text>
                    <Text style={{ color: c.muted, fontSize: 13, lineHeight: 19 }} numberOfLines={open ? undefined : 3}>{a.content}</Text>
                    {open ? <T v="small">{[audienceText(a), fullDateTime(a.created_at)].filter(Boolean).join(' · ')}</T> : null}
                    <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>{open ? 'Show less' : 'Read more'}</Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </Gate>
    </Screen>
  );
}
