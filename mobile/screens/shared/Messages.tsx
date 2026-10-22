import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Text, TextInput } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useInbox } from '@/context/InboxContext';
import { Button, Card, EmptyState, ErrorState, LoadingBlock, Screen, Segmented, SelectField, Sheet, T } from '@/components/ui';
import api, { errorMessage } from '@/services/api';
import { Avatar, SearchBox, dayLabel, relativeTime, timeOf } from './sharedBits';

const MAX_LEN = 2000;
// The tab bar floats ~72px over the bottom of the screen.
const TAB_SPACE = 84;

type Thread = { id: number; other: { id: number; name: string; subtitle: string }; last_body: string; last_from_me: boolean; last_message_at: string; unread: number };
type Msg = { id: number; mine: boolean; body: string; created_at: string; read: boolean };
type Conversation = { id: number; other: { id: number; name: string; subtitle: string }; messages: Msg[] };

export default function Messages() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const inbox = useInbox();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  if (activeId !== null) {
    return <ThreadView id={activeId} onBack={() => setActiveId(null)} onChanged={inbox.refresh} />;
  }
  return (
    <>
      <ThreadList
        isTeacher={isTeacher}
        onOpen={setActiveId}
        onCompose={() => setComposeOpen(true)}
      />
      {isTeacher ? <Compose visible={composeOpen} onClose={() => setComposeOpen(false)} onSent={(id) => { setComposeOpen(false); inbox.refresh(); if (id) setActiveId(id); }} /> : null}
    </>
  );
}

/* ---------- list ---------- */
function ThreadList({ isTeacher, onOpen, onCompose }: { isTeacher: boolean; onOpen: (id: number) => void; onCompose: () => void }) {
  const { c } = useAppTheme();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await api.get('/messages/threads');
      setThreads(Array.isArray(res.data) ? res.data : []); setError(null);
    } catch (e) {
      setThreads((cur) => { if (!cur) setError(errorMessage(e, 'Could not load your messages.')); return cur; });
    } finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (threads || []).filter((t) => !q || t.other.name.toLowerCase().includes(q) || (t.last_body || '').toLowerCase().includes(q));
  }, [threads, query]);

  return (
    <Screen onRefresh={() => load(true)} refreshing={refreshing}>
      {isTeacher ? <Button label="New message" icon="create-outline" onPress={onCompose} /> : null}
      {threads === null && !error ? <LoadingBlock cards={4} /> : error && !threads ? <ErrorState message={error} onRetry={() => load()} /> : (
        <>
          {(threads || []).length > 0 ? <SearchBox value={query} onChange={setQuery} placeholder="Search conversations…" /> : null}
          {shown.length === 0 ? (
            <EmptyState icon="chatbubbles-outline" text={(threads || []).length === 0 ? (isTeacher ? 'No conversations yet. Start one with “New message”.' : 'No messages yet. Messages from your teachers will appear here.') : 'No conversations match your search.'} />
          ) : (
            <Card pad={false}>
              {shown.map((t, i) => (
                <Pressable key={t.id} onPress={() => onOpen(t.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border, opacity: pressed ? 0.7 : 1 })}>
                  <Avatar name={t.other.name} size={46} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <T v="body" style={{ fontWeight: t.unread ? '700' : '500', flex: 1 }} numberOfLines={1}>{t.other.name}</T>
                      <T v="small">{relativeTime(t.last_message_at)}</T>
                    </View>
                    <T v="small" numberOfLines={1}>{t.other.subtitle}</T>
                    <T v="muted" numberOfLines={1} style={{ fontWeight: t.unread ? '700' : '400', color: t.unread ? c.text : c.muted }}>{t.last_from_me ? 'You: ' : ''}{t.last_body}</T>
                  </View>
                  {t.unread > 0 ? (
                    <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>{t.unread}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

/* ---------- one conversation ---------- */
function ThreadView({ id, onBack, onChanged }: { id: number; onBack: () => void; onChanged: () => void }) {
  const { c } = useAppTheme();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [kb, setKb] = useState(false);
  const list = useRef<FlatList>(null);

  const load = useCallback(async (silent: boolean) => {
    try {
      const res = await api.get(`/messages/threads/${id}`);
      setConv(res.data); setError(null); onChanged();
    } catch (e) {
      if (!silent) setError(errorMessage(e, 'Could not open the conversation.'));
    }
  }, [id, onChanged]);

  useEffect(() => {
    load(false);
    const t = setInterval(() => load(true), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  const rows = useMemo(() => {
    const out: ({ type: 'day'; id: string; label: string } | { type: 'msg'; id: string; m: Msg })[] = [];
    let last = '';
    (conv?.messages || []).forEach((m) => {
      const d = new Date(m.created_at).toDateString();
      if (d !== last) { out.push({ type: 'day', id: `d-${m.id}`, label: dayLabel(m.created_at) }); last = d; }
      out.push({ type: 'msg', id: `m-${m.id}`, m });
    });
    return out;
  }, [conv]);

  const count = conv?.messages.length || 0;
  useEffect(() => { if (count) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80); }, [count]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api.post(`/messages/threads/${id}/reply`, { body: text });
      setDraft('');
      await load(true);
    } catch (e) {
      Alert.alert('Not sent', errorMessage(e, 'Could not send the message.'));
    } finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Back to conversations"><Ionicons name="arrow-back" size={22} color={c.text} /></Pressable>
        {conv ? <Avatar name={conv.other.name} size={38} /> : null}
        <View style={{ flex: 1 }}>
          <T v="h2" numberOfLines={1}>{conv?.other.name || 'Loading…'}</T>
          <T v="small" numberOfLines={1}>{conv?.other.subtitle}</T>
        </View>
      </View>

      {error && !conv ? <View style={{ padding: 16 }}><ErrorState message={error} onRetry={() => load(false)} /></View> : !conv ? <View style={{ padding: 16 }}><LoadingBlock cards={2} /></View> : (
        <FlatList
          ref={list}
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 14, gap: 8, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState text="No messages in this conversation yet." icon="chatbubbles-outline" />}
          renderItem={({ item }) => item.type === 'day' ? (
            <View style={{ alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ color: c.muted, backgroundColor: c.surfaceAlt, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, overflow: 'hidden' }}>{item.label.toUpperCase()}</Text>
            </View>
          ) : (
            <View style={{ alignItems: item.m.mine ? 'flex-end' : 'flex-start' }}>
              <View style={{ maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderBottomRightRadius: item.m.mine ? 4 : 18, borderBottomLeftRadius: item.m.mine ? 18 : 4, backgroundColor: item.m.mine ? c.accent : c.surface, borderWidth: item.m.mine ? 0 : 1, borderColor: c.border }}>
                <Text style={{ color: item.m.mine ? '#ffffff' : c.text, fontSize: 14, lineHeight: 20 }}>{item.m.body}</Text>
                <Text style={{ marginTop: 3, textAlign: 'right', fontSize: 10, fontWeight: '700', color: item.m.mine ? '#ffffffcc' : c.faint }}>{timeOf(item.m.created_at)}{item.m.mine && item.m.read ? ' · Seen' : ''}</Text>
              </View>
            </View>
          )}
        />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 10, paddingBottom: kb ? 10 : TAB_SPACE, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
        <TextInput
          value={draft} onChangeText={setDraft} multiline maxLength={MAX_LEN} placeholder="Write a reply…" placeholderTextColor={c.faint}
          style={{ flex: 1, maxHeight: 110, minHeight: 44, backgroundColor: c.surfaceAlt, borderRadius: 18, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, color: c.text, fontSize: 14 }}
        />
        <Pressable onPress={send} disabled={sending || !draft.trim()} accessibilityLabel="Send" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: sending || !draft.trim() ? 0.45 : 1 }}>
          <Ionicons name="send" size={18} color="#ffffff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------- new message (teachers) ---------- */
type Contacts = { students: { user_id: number; name: string; roll: string | null; course_id: number; course_name: string; semester: number }[]; parents: { user_id: number; name: string; wards: string }[] };

function Compose({ visible, onClose, onSent }: { visible: boolean; onClose: () => void; onSent: (threadId?: number) => void }) {
  const { c } = useAppTheme();
  const [contacts, setContacts] = useState<Contacts | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<'students' | 'parents'>('students');
  const [query, setQuery] = useState('');
  const [classKey, setClassKey] = useState('all');
  const [selected, setSelected] = useState<number[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected([]); setBody(''); setQuery(''); setTab('students'); setClassKey('all'); setContacts(null); setLoadError(null);
    api.get('/messages/contacts').then((r) => setContacts(r.data)).catch((e) => setLoadError(errorMessage(e, 'Could not load your contacts.')));
  }, [visible]);

  const classes = useMemo(() => {
    const map = new Map<string, string>();
    (contacts?.students || []).forEach((s) => { const k = `${s.course_id}-${s.semester}`; if (!map.has(k)) map.set(k, `${s.course_name} · Sem ${s.semester}`); });
    return [...map.entries()];
  }, [contacts]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (tab === 'students') {
      return (contacts?.students || [])
        .filter((s) => (classKey === 'all' || `${s.course_id}-${s.semester}` === classKey) && (!q || s.name.toLowerCase().includes(q) || String(s.roll || '').toLowerCase().includes(q)))
        .map((s) => ({ id: s.user_id, name: s.name, sub: `${s.roll || 'No roll no.'} · ${s.course_name} Sem ${s.semester}` }));
    }
    return (contacts?.parents || [])
      .filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.wards || '').toLowerCase().includes(q))
      .map((p) => ({ id: p.user_id, name: p.name, sub: `Parent of ${p.wards}` }));
  }, [contacts, tab, query, classKey]);

  const chosen = new Set(selected);
  const allShown = list.length > 0 && list.every((p) => chosen.has(p.id));
  const toggle = (id: number) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleShown = () => setSelected((cur) => (allShown ? cur.filter((id) => !list.some((p) => p.id === id)) : [...new Set([...cur, ...list.map((p) => p.id)])]));

  const send = async () => {
    if (!selected.length) { Alert.alert('Choose recipients', 'Choose at least one recipient.'); return; }
    if (!body.trim()) { Alert.alert('Write a message', 'Please write a message first.'); return; }
    setSending(true);
    try {
      const res = await api.post('/messages/send', { recipient_user_ids: selected, body: body.trim() });
      onSent(res.data?.sent === 1 ? res.data?.thread_id : undefined);
    } catch (e) {
      Alert.alert('Not sent', errorMessage(e, 'Could not send the message.'));
    } finally { setSending(false); }
  };

  const SHOW = 80;
  return (
    <Sheet visible={visible} title="New message" onClose={() => !sending && onClose()}>
      {loadError ? <ErrorState message={loadError} /> : !contacts ? <LoadingBlock cards={1} /> : (
        <>
          <Segmented value={tab} onChange={setTab} options={[{ value: 'students', label: 'Students' }, { value: 'parents', label: 'Parents' }]} />
          {tab === 'students' && classes.length > 1 ? (
            <SelectField value={classKey} onChange={(v) => setClassKey(String(v))} options={[{ value: 'all', label: 'All classes' }, ...classes.map(([k, l]) => ({ value: k, label: l }))]} />
          ) : null}
          <SearchBox value={query} onChange={setQuery} placeholder="Search…" />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="small">{selected.length} selected</T>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable onPress={toggleShown} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>{allShown ? 'Unselect shown' : 'Select all shown'}</Text></Pressable>
              {selected.length > 0 ? <Pressable onPress={() => setSelected([])} hitSlop={8}><Text style={{ color: c.danger, fontWeight: '700', fontSize: 12 }}>Clear</Text></Pressable> : null}
            </View>
          </View>
          {list.length === 0 ? <EmptyState text={tab === 'parents' ? 'No parent accounts found for your classes.' : 'No students found.'} icon="people-outline" /> : (
            <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 14, overflow: 'hidden' }}>
              {list.slice(0, SHOW).map((p, i) => {
                const on = chosen.has(p.id);
                return (
                  <Pressable key={p.id} onPress={() => toggle(p.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border, backgroundColor: on ? c.primarySoft : 'transparent' }}>
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? c.primary : c.faint} />
                    <View style={{ flex: 1 }}>
                      <T v="body" style={{ fontWeight: '700' }} numberOfLines={1}>{p.name}</T>
                      <T v="small" numberOfLines={1}>{p.sub}</T>
                    </View>
                  </Pressable>
                );
              })}
              {list.length > SHOW ? <View style={{ padding: 10 }}><T v="small" style={{ textAlign: 'center' }}>Showing {SHOW} of {list.length}. Search to narrow the list.</T></View> : null}
            </View>
          )}
          <View style={{ gap: 6 }}>
            <TextInput value={body} onChangeText={setBody} multiline maxLength={MAX_LEN} placeholder="Write your message…" placeholderTextColor={c.faint}
              style={{ minHeight: 100, textAlignVertical: 'top', backgroundColor: c.surfaceAlt, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: 12, color: c.text, fontSize: 14 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T v="small" style={{ flex: 1 }}>{selected.length > 1 ? 'Each person gets a private conversation; they cannot see each other.' : ''}</T>
              <T v="small">{body.length} / {MAX_LEN}</T>
            </View>
          </View>
          <Button label={sending ? 'Sending…' : selected.length > 1 ? `Send to ${selected.length} people` : 'Send'} icon="send" onPress={send} loading={sending} />
        </>
      )}
    </Sheet>
  );
}
