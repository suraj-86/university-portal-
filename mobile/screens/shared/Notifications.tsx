import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useInbox } from '@/context/InboxContext';
import { NAV } from '@/lib/nav';
import { Button, Card, EmptyState, ErrorState, LoadingBlock, Screen, T } from '@/components/ui';
import api, { errorMessage } from '@/services/api';
import { FilterChips, relativeTime } from './sharedBits';

type Item = { id: number; type: string; title: string; body: string; link: string | null; read: boolean; created_at: string };
type Page = { unread: number; has_more: boolean; items: Item[] };

const PAGE = 20;
type IconName = keyof typeof Ionicons.glyphMap;
const META: Record<string, { icon: IconName; tone: 'info' | 'success' | 'warn' | 'danger' | 'neutral' }> = {
  notice: { icon: 'notifications-outline', tone: 'info' },
  announcement: { icon: 'megaphone-outline', tone: 'info' },
  message: { icon: 'chatbubble-ellipses-outline', tone: 'info' },
  fee: { icon: 'wallet-outline', tone: 'success' },
  payment: { icon: 'wallet-outline', tone: 'success' },
  fee_reminder: { icon: 'alert-circle-outline', tone: 'warn' },
  hostel: { icon: 'business-outline', tone: 'info' },
  timetable: { icon: 'time-outline', tone: 'warn' },
  security: { icon: 'shield-checkmark-outline', tone: 'danger' },
};

export default function Notifications() {
  const { c } = useAppTheme();
  const { user } = useAuth();
  const router = useRouter();
  const inbox = useInbox();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const fetchFirst = useCallback(async (mode: 'load' | 'refresh') => {
    const id = ++seq.current;
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { limit: PAGE, unread: filter === 'unread' ? 1 : undefined } });
      if (id !== seq.current) return;
      const d: Page = res.data;
      setItems(d.items || []); setUnread(d.unread || 0); setHasMore(!!d.has_more); setError(null);
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e, 'Could not load notifications.'));
    } finally {
      if (id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [filter]);

  useEffect(() => { fetchFirst('load'); }, [fetchFirst]);

  const loadMore = async () => {
    if (loadingMore || !items.length) return;
    setLoadingMore(true);
    try {
      const res = await api.get('/notifications', { params: { limit: PAGE, before: items[items.length - 1].id, unread: filter === 'unread' ? 1 : undefined } });
      const d: Page = res.data;
      setItems((cur) => [...cur, ...(d.items || [])]); setHasMore(!!d.has_more);
    } catch (e) {
      setError(errorMessage(e, 'Could not load more.'));
    } finally { setLoadingMore(false); }
  };

  const markAll = async () => {
    try {
      await api.post('/notifications/read', { all: true });
      setItems((cur) => cur.map((n) => ({ ...n, read: true }))); setUnread(0); inbox.refresh();
    } catch (e) { setError(errorMessage(e, 'Could not mark as read.')); }
  };

  const open = (n: Item) => {
    if (!n.read) {
      setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.post('/notifications/read', { ids: [n.id] }).then(() => inbox.refresh()).catch(() => {});
    }
    // Only go to pages this app has for the user's role.
    const role = user?.role;
    const m = n.link ? n.link.match(/^\/(student|parent|teacher)\/([\w-]+)$/) : null;
    if (m && role === m[1] && ((NAV as any)[role] || []).some((i: any) => i.name === m[2])) router.navigate(n.link as any);
  };

  return (
    <Screen onRefresh={() => fetchFirst('refresh')} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <FilterChips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: unread }]} />
        </View>
        {unread > 0 ? (
          <Pressable onPress={markAll} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-done" size={16} color={c.success} />
            <Text style={{ color: c.success, fontWeight: '700', fontSize: 12 }}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {loading && !items.length ? <LoadingBlock cards={4} /> : error && !items.length ? <ErrorState message={error} onRetry={() => fetchFirst('load')} /> : items.length === 0 ? (
        <EmptyState text={filter === 'unread' ? 'You have no unread notifications.' : 'No notifications yet.'} icon="notifications-off-outline" />
      ) : (
        <>
          {items.map((n) => {
            const meta = META[n.type] || META.notice;
            const fg = c[meta.tone === 'neutral' ? 'muted' : meta.tone === 'info' ? 'primary' : meta.tone];
            const bg = meta.tone === 'neutral' ? c.surfaceAlt : meta.tone === 'info' ? c.primarySoft : c[`${meta.tone}Soft` as 'successSoft'];
            return (
              <Card key={n.id} onPress={() => open(n)} style={n.read ? undefined : { borderColor: c.primary }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={meta.icon} size={20} color={fg as string} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <T v="body" style={{ fontWeight: n.read ? '500' : '700', flex: 1 }}>{n.title}</T>
                      {!n.read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary, marginTop: 5 }} /> : null}
                    </View>
                    {n.body ? <T v="muted" numberOfLines={3}>{n.body}</T> : null}
                    <T v="small">{relativeTime(n.created_at)}</T>
                  </View>
                </View>
              </Card>
            );
          })}
          {error ? <T v="small" style={{ color: c.danger, textAlign: 'center' }}>{error}</T> : null}
          {hasMore ? <Button label="Load more" variant="soft" onPress={loadMore} loading={loadingMore} /> : null}
        </>
      )}
    </Screen>
  );
}
