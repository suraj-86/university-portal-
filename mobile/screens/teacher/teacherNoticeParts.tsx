import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { Text, TextInput } from '@/components/AppText';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useInbox } from '@/context/InboxContext';
import { radius } from '@/constants/theme';
import { Badge, Button, Card, EmptyState, Field, ProgressBar, Segmented, SelectField, Sheet, T, B } from '@/components/ui';
import api, { errorMessage, getFileUrl } from '@/services/api';
import { Avatar, SearchBox, fileDisplayName, fullDateTime, relativeTime } from '../shared/sharedBits';

/* ------------------------------------------------------------------ types */
export type FeedNotice = {
  id: number; title: string; content: string; priority?: string; attachment_url?: string | null; target_role?: string;
  created_at: string; author_name?: string; author_role?: string; subject_name?: string | null; is_read: boolean; is_personal: boolean;
};
export type SentNotice = {
  id: number; title: string; content: string; priority?: string; attachment_url?: string | null; target_role: string; subject_id?: number | null;
  created_at: string; subject_name?: string | null; semester?: number | null; author_name?: string; recipient_count: number; read_count: number;
};
export type ClassRow = { id: number; subject_code: string; subject_name: string; course_name?: string; semester: number | string };
export type Target = { student_id: number; name: string; roll?: string | null; course_id: number; course_code?: string; course_name?: string; semester: number | string; parents: number };
type Picked = { uri: string; name: string; mimeType?: string | null; size?: number | null };

const MAX_BYTES = 5 * 1024 * 1024;
const DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const openAttachment = (u: string) => {
  const link = getFileUrl(u);
  if (link) Linking.openURL(link).catch(() => Alert.alert('Could not open the attachment', 'Please try again.'));
};

const audienceLabel = (n: SentNotice) => {
  if (n.target_role === 'targeted') return `${n.recipient_count} selected ${n.recipient_count === 1 ? 'recipient' : 'recipients'}`;
  if (n.subject_id) return `Class · ${n.subject_name || 'Subject'}${n.semester ? ` · Sem ${n.semester}` : ''}`;
  return ({ all: 'Everyone', teacher: 'All teachers', student: 'All students', parent: 'All parents' } as Record<string, string>)[n.target_role] || 'Everyone';
};

/* -------------------------------------------------------------- shared UI */
function PriorityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Segmented options={[{ value: 'Normal', label: 'Normal' }, { value: 'High', label: 'High' }]} value={value} onChange={onChange} />;
}

function AttachmentPick({ file, onFile, existingUrl, onRemoveExisting }: {
  file: Picked | null; onFile: (f: Picked | null) => void; existingUrl?: string | null; onRemoveExisting?: () => void;
}) {
  const { c } = useAppTheme();
  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      if (a.size && a.size > MAX_BYTES) { Alert.alert('File too large', 'Attachments can be up to 5 MB.'); return; }
      onFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size });
    } catch {
      Alert.alert('Could not open files', 'Please try again.');
    }
  };
  const shown = file ? file.name : existingUrl ? fileDisplayName(existingUrl) : null;
  return (
    <View style={{ gap: 6 }}>
      <T v="label">Attachment (PDF, DOC or DOCX, up to 5 MB)</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: 10 }}>
        <Ionicons name="attach" size={18} color={c.primary} />
        <T v="body" style={{ flex: 1 }} numberOfLines={1}>{shown || 'No file chosen'}</T>
        {shown ? (
          <Pressable hitSlop={8} onPress={() => { if (file) onFile(null); else onRemoveExisting?.(); }} accessibilityLabel="Remove attachment">
            <Ionicons name="close-circle" size={20} color={c.muted} />
          </Pressable>
        ) : null}
      </View>
      <Button label={shown ? 'Choose a different file' : 'Choose file'} variant="soft" icon="document-attach-outline" onPress={pick} />
    </View>
  );
}

const textArea = (c: any) => ({ backgroundColor: c.surfaceAlt, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text, minHeight: 120, textAlignVertical: 'top' as const });

function Message({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { c } = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <T v="label">Message</T>
      <TextInput value={value} onChangeText={onChange} multiline maxLength={5000} placeholder="Write your notice here..." placeholderTextColor={c.faint} style={textArea(c)} />
      <T v="small" style={{ textAlign: 'right' }}>{value.length} / 5000</T>
    </View>
  );
}

const appendFile = (fd: FormData, f: Picked) => {
  fd.append('attachment', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' } as any);
};
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

/* --------------------------------------------------------------- Received */
const matchesQuery = (n: FeedNotice, q: string) =>
  !q || n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) || (n.author_name || '').toLowerCase().includes(q);

export function ReceivedTab({ items: raw }: { items: FeedNotice[] }) {
  const { c } = useAppTheme();
  const { refresh: refreshInbox } = useInbox();
  const [readIds, setReadIds] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<FeedNotice | null>(null);

  const items = useMemo(() => raw.map((n) => (readIds.includes(n.id) ? { ...n, is_read: true } : n)), [raw, readIds]);
  const unread = items.filter((n) => !n.is_read);
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return items.filter((n) => matchesQuery(n, q)); }, [items, query]);

  const markRead = async (ids: number[]) => {
    if (!ids.length) return;
    setReadIds((cur) => [...new Set([...cur, ...ids])]);
    try { await api.post('/notices/read', { ids }); refreshInbox(); } catch { /* badge corrects itself on next refresh */ }
  };
  const open = (n: FeedNotice) => { setActive(n); if (!n.is_read) markRead([n.id]); };
  const source = (n: FeedNotice) => (n.is_personal ? 'For you' : n.author_role === 'teacher' ? 'Faculty' : 'Administration');

  return (
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
      {visible.length === 0 ? (
        <Card><EmptyState text={items.length === 0 ? 'No notices yet.' : 'No notices match your search.'} icon="megaphone-outline" /></Card>
      ) : visible.map((n) => {
        const high = n.priority === 'High';
        return (
          <Card key={n.id} onPress={() => open(n)} style={{ borderColor: n.is_read ? c.border : c.primary, borderLeftWidth: 4, borderLeftColor: high ? c.danger : c.primary }}>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <Badge label={source(n)} tone={n.is_personal ? 'info' : 'neutral'} />
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

      <Sheet visible={!!active} title={active?.title || ''} onClose={() => setActive(null)}>
        {active ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Badge label={source(active)} tone={active.is_personal ? 'info' : 'neutral'} />
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
    </>
  );
}

/* ------------------------------------------------------------------- Sent */
type Reader = { name: string; role: string; is_read: boolean };

function SentCard({ n, onEdit, onDelete }: { n: SentNotice; onEdit: (n: SentNotice) => void; onDelete: (n: SentNotice) => void }) {
  const { c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [readers, setReaders] = useState<Reader[] | null>(null);
  const targeted = n.target_role === 'targeted';
  const high = n.priority === 'High';
  const pct = targeted && n.recipient_count ? Math.round((n.read_count / n.recipient_count) * 100) : null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && targeted && readers === null) {
      try {
        const res = await api.get(`/notices/${n.id}/readers`);
        setReaders(res.data?.recipients || []);
      } catch (e) {
        setReaders([]);
        Alert.alert('Could not load recipients', errorMessage(e));
      }
    }
  };

  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: high ? c.danger : c.primary }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Badge label={audienceLabel(n)} tone="info" />
          {high ? <Badge label="High priority" tone="danger" /> : null}
          <View style={{ flex: 1 }} />
          <T v="small">{relativeTime(n.created_at)}</T>
        </View>
        <T v="h2">{n.title}</T>
        <T v="muted" numberOfLines={open ? undefined : 2} selectable={open}>{n.content}</T>
        {n.attachment_url ? (
          <Pressable onPress={() => openAttachment(n.attachment_url as string)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="attach" size={16} color={c.primary} />
            <Text style={{ color: c.primary, fontWeight: '700', fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{fileDisplayName(n.attachment_url)}</Text>
          </Pressable>
        ) : null}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="small" style={{ fontWeight: '700' }}>{targeted ? `${n.read_count} of ${n.recipient_count} read` : `${n.read_count} read`}</T>
            {pct !== null ? <T v="small" style={{ fontWeight: '700' }}>{pct}%</T> : null}
          </View>
          {pct !== null ? <ProgressBar value={n.read_count} max={n.recipient_count} tone="success" /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 2 }}>
          <Pressable onPress={toggle} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={open ? 'chevron-up' : 'eye-outline'} size={16} color={c.muted} />
            <Text style={{ color: c.muted, fontWeight: '700', fontSize: 13 }}>{open ? 'Hide' : 'Details'}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => onEdit(n)} hitSlop={8} accessibilityLabel="Edit notice"><Ionicons name="create-outline" size={20} color={c.primary} /></Pressable>
          <Pressable onPress={() => onDelete(n)} hitSlop={8} accessibilityLabel="Delete notice"><Ionicons name="trash-outline" size={20} color={c.danger} /></Pressable>
        </View>
        {open && targeted ? (
          <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 12, gap: 6 }}>
            <T v="label">Recipients</T>
            {readers === null ? <T v="small">Loading...</T> : readers.length === 0 ? <T v="small">No recipients found.</T> : readers.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <T v="body" style={{ flex: 1 }} numberOfLines={1}><B>{r.name}</B> <T v="small">{r.role}</T></T>
                <Badge label={r.is_read ? 'Read' : 'Not read'} tone={r.is_read ? 'success' : 'neutral'} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function EditSheet({ notice, onClose, onSaved }: { notice: SentNotice | null; onClose: () => void; onSaved: () => void }) {
  const [seed, setSeed] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [file, setFile] = useState<Picked | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [saving, setSaving] = useState(false);

  if (notice && seed !== notice.id) {
    setSeed(notice.id); setTitle(notice.title); setContent(notice.content); setPriority(notice.priority || 'Normal'); setFile(null); setRemoveExisting(false);
  }

  const save = async () => {
    if (!notice) return;
    if (!title.trim() || !content.trim()) { Alert.alert('Missing details', 'Title and message are required.'); return; }
    const targeted = notice.target_role === 'targeted';
    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('content', content.trim());
    fd.append('priority', priority);
    if (file) appendFile(fd, file);
    setSaving(true);
    try {
      if (targeted) {
        if (!file && removeExisting) fd.append('remove_attachment', 'true');
        await api.put(`/notices/targeted/${notice.id}`, fd, MULTIPART);
      } else {
        fd.append('target_role', notice.target_role);
        if (notice.subject_id) fd.append('subject_id', String(notice.subject_id));
        if (!file && notice.attachment_url && !removeExisting) fd.append('attachment_url', notice.attachment_url);
        await api.put(`/notices/${notice.id}`, fd, MULTIPART);
      }
      setSeed(null);
      onSaved();
    } catch (e) {
      Alert.alert('Could not update the notice', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const close = () => { setSeed(null); onClose(); };
  return (
    <Sheet visible={!!notice} title="Edit notice" onClose={close}>
      {notice ? (
        <>
          <T v="small">Audience: {audienceLabel(notice)} (cannot be changed)</T>
          <Field label="Title" value={title} onChangeText={setTitle} maxLength={255} />
          <Message value={content} onChange={setContent} />
          <View style={{ gap: 6 }}><T v="label">Priority</T><PriorityPicker value={priority} onChange={setPriority} /></View>
          <AttachmentPick file={file} onFile={setFile} existingUrl={removeExisting ? null : notice.attachment_url} onRemoveExisting={() => setRemoveExisting(true)} />
          <Button label="Save changes" icon="save-outline" onPress={save} loading={saving} />
        </>
      ) : null}
    </Sheet>
  );
}

export function SentTab({ items, onChanged }: { items: SentNotice[]; onChanged: () => void }) {
  const { refresh: refreshInbox } = useInbox();
  const [editing, setEditing] = useState<SentNotice | null>(null);

  const remove = (n: SentNotice) => {
    Alert.alert('Delete this notice?', `"${n.title}" will be removed and everyone will lose access to it.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(n.target_role === 'targeted' ? `/notices/targeted/${n.id}` : `/notices/${n.id}`);
            onChanged(); refreshInbox();
          } catch (e) {
            Alert.alert('Could not delete the notice', errorMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <>
      {items.length === 0 ? (
        <Card><EmptyState text="You have not sent any notices yet." icon="megaphone-outline" /></Card>
      ) : items.map((n) => <SentCard key={n.id} n={n} onEdit={setEditing} onDelete={remove} />)}
      <EditSheet notice={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); refreshInbox(); }} />
    </>
  );
}

/* ---------------------------------------------------------------- Compose */
const AUDIENCES = [
  { value: 'students', label: 'Students' }, { value: 'parents', label: 'Parents' }, { value: 'both', label: 'Both' },
];
const SHOW_LIMIT = 60;

function RecipientList({ students, selected, onChange }: { students: Target[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const { c } = useAppTheme();
  const [classKey, setClassKey] = useState('all');
  const [query, setQuery] = useState('');
  const classes = useMemo(() => {
    const m = new Map<string, string>();
    students.forEach((s) => { const k = `${s.course_id}-${s.semester}`; if (!m.has(k)) m.set(k, `${s.course_code || s.course_name} · Sem ${s.semester}`); });
    return [...m.entries()].map(([value, label]) => ({ value, label }));
  }, [students]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => (classKey === 'all' || `${s.course_id}-${s.semester}` === classKey)
      && (!q || s.name.toLowerCase().includes(q) || String(s.roll || '').toLowerCase().includes(q)));
  }, [students, classKey, query]);
  const chosen = new Set(selected);
  const toggle = (id: number) => onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const allShown = shown.length > 0 && shown.every((s) => chosen.has(s.student_id));
  const toggleShown = () => {
    if (allShown) { const hide = new Set(shown.map((s) => s.student_id)); onChange(selected.filter((id) => !hide.has(id))); }
    else onChange([...new Set([...selected, ...shown.map((s) => s.student_id)])]);
  };
  const list = shown.slice(0, SHOW_LIMIT);

  return (
    <View style={{ gap: 10 }}>
      <SearchBox value={query} onChange={setQuery} placeholder="Search name or roll no." />
      <SelectField value={classKey} onChange={setClassKey} options={[{ value: 'all', label: 'All classes' }, ...classes]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T v="small" style={{ fontWeight: '700' }}>{selected.length} selected · {shown.length} shown</T>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable onPress={toggleShown} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>{allShown ? 'Unselect shown' : 'Select all shown'}</Text></Pressable>
          {selected.length > 0 ? <Pressable onPress={() => onChange([])} hitSlop={8}><Text style={{ color: c.danger, fontWeight: '700', fontSize: 13 }}>Clear</Text></Pressable> : null}
        </View>
      </View>
      <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.md, overflow: 'hidden' }}>
        {list.length === 0 ? <View style={{ padding: 16 }}><T v="muted" style={{ textAlign: 'center' }}>No students found.</T></View> : list.map((s, i) => {
          const on = chosen.has(s.student_id);
          return (
            <Pressable key={s.student_id} onPress={() => toggle(s.student_id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border, backgroundColor: on ? c.primarySoft : 'transparent' }}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? c.primary : c.faint} />
              <View style={{ flex: 1 }}>
                <T v="body" style={{ fontWeight: '700' }} numberOfLines={1}>{s.name}</T>
                <T v="small" numberOfLines={1}>{s.roll || 'No roll no.'} · {s.course_code || s.course_name} Sem {s.semester}</T>
              </View>
              <Badge label={s.parents ? `${s.parents} ${s.parents > 1 ? 'parents' : 'parent'}` : 'no parent'} tone={s.parents ? 'success' : 'neutral'} />
            </Pressable>
          );
        })}
      </View>
      {shown.length > SHOW_LIMIT ? <T v="small">Showing the first {SHOW_LIMIT}. Search or pick a class to narrow the list.</T> : null}
    </View>
  );
}

export function ComposeTab({ classes, targets, onSent }: { classes: ClassRow[]; targets: Target[]; onSent: () => void }) {
  const { refresh: refreshInbox } = useInbox();
  const [mode, setMode] = useState<'class' | 'students'>('class');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [file, setFile] = useState<Picked | null>(null);
  const [classId, setClassId] = useState('');
  const [audience, setAudience] = useState('students');
  const [selected, setSelected] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) { Alert.alert('Missing details', 'Please enter a title and a message.'); return; }
    if (mode === 'class' && !classId) { Alert.alert('Choose a class', 'Please choose a class.'); return; }
    if (mode === 'students' && selected.length === 0) { Alert.alert('Choose recipients', 'Select at least one student.'); return; }
    const fd = new FormData();
    fd.append('title', title.trim());
    fd.append('content', content.trim());
    fd.append('priority', priority);
    if (file) appendFile(fd, file);
    let url = '/notices';
    if (mode === 'class') { fd.append('target_role', 'student'); fd.append('subject_id', classId); }
    else { url = '/notices/targeted'; fd.append('audience', audience); fd.append('student_ids', JSON.stringify(selected)); }
    setSending(true);
    try {
      const res = await api.post(url, fd, MULTIPART);
      Alert.alert('Notice sent', mode === 'students' ? `Sent to ${res.data?.recipients ?? selected.length} people.` : 'Notice published.');
      setTitle(''); setContent(''); setPriority('Normal'); setFile(null); setSelected([]);
      refreshInbox();
      onSent();
    } catch (e) {
      Alert.alert('Could not send the notice', errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <View style={{ gap: 16 }}>
        <Segmented options={[{ value: 'class', label: 'Entire class' }, { value: 'students', label: 'Specific students' }]} value={mode} onChange={setMode} />
        {mode === 'class' ? (
          <View style={{ gap: 6 }}>
            <SelectField label="Class" value={classId} onChange={(v) => setClassId(String(v))} placeholder="Select one of your classes"
              options={classes.map((k) => ({ value: String(k.id), label: `${k.subject_code} · ${k.subject_name} (Sem ${k.semester})` }))} />
            <T v="small">Every student in this class sees it, and their parents see it too.</T>
            {classes.length === 0 ? <T v="small">You have no assigned classes yet.</T> : null}
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 6 }}><T v="label">Who should receive it?</T><Segmented options={AUDIENCES} value={audience} onChange={setAudience} /></View>
            <View style={{ gap: 6 }}><T v="label">Choose students</T><RecipientList students={targets} selected={selected} onChange={setSelected} /></View>
          </View>
        )}
        <Field label="Title" value={title} onChangeText={setTitle} maxLength={255} placeholder="e.g. Submit your project report by Friday" />
        <Message value={content} onChange={setContent} />
        <View style={{ gap: 6 }}><T v="label">Priority</T><PriorityPicker value={priority} onChange={setPriority} /></View>
        <AttachmentPick file={file} onFile={setFile} />
        <Button label="Send notice" icon="send" onPress={submit} loading={sending} />
      </View>
    </Card>
  );
}
