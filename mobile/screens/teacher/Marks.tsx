import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingBlock, Notice, ProgressBar, Screen, SelectField, Segmented, Sheet, T, useLoad } from '@/components/ui';
import api, { errorMessage } from '@/services/api';
import {
  DEFAULT_LABELS, DEFAULT_MAX, PASS_PERCENT, STANDARD_TYPES, ScoreRow, SearchInput, StatTile, cleanName, cleanScoreText, computeStats, isEntered, q, useHistory, validMax,
  type LedgerRow, type Student, type Subject, type Summary,
} from './marksBits';

type Mode = 'entry' | 'ledger';
type Custom = { name: string; max: number };
type Setting = { display_name?: string | null; max_score?: number };
type Detail = { id: number; student_id?: number; name: string; roll_number?: string; score: number; max_score?: number };

const SEMS = [1, 2, 3, 4, 5, 6, 7, 8];
const semOptions = [{ value: 'All', label: 'All semesters' }, ...SEMS.map((s) => ({ value: String(s), label: `Semester ${s}` }))];

export default function Marks() {
  const { c } = useAppTheme();
  const { user } = useAuth();
  const subjects = useLoad(user?.id ? [`/teacher/${user.id}/assigned-subjects`, `/teacher/${user.id}/marks-ledger`] : null);
  const classes: Subject[] = Array.isArray(subjects.data?.[0]) ? subjects.data![0] : [];
  const ledger: LedgerRow[] = Array.isArray(subjects.data?.[1]) ? subjects.data![1] : [];

  const [mode, setMode] = useState<Mode>('entry');
  const [semester, setSemester] = useState('All');
  const [classId, setClassId] = useState('');
  const [type, setType] = useState<string>('Assignment');
  const [aName, setAName] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [customs, setCustoms] = useState<Custom[]>([]);
  const [settings, setSettings] = useState<Record<string, Setting>>({});

  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [roster, setRoster] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [orig, setOrig] = useState<Record<number, number>>({});
  const [origMax, setOrigMax] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [filter, setFilter] = useState('');

  const [summary, setSummary] = useState<Summary | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState('10');
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMax, setEditMax] = useState('10');
  const [editReason, setEditReason] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const [lSem, setLSem] = useState('All');
  const [lSubject, setLSubject] = useState('All');
  const [viewRec, setViewRec] = useState<LedgerRow | null>(null);
  const [viewRows, setViewRows] = useState<Detail[] | null>(null);
  const history = useHistory();

  const standardLabel = (t: string) => settings[t]?.display_name || DEFAULT_LABELS[t] || t;
  const standardMax = (t: string) => settings[t]?.max_score ?? DEFAULT_MAX[t];
  const isCustom = type === 'Other';
  const label = isCustom ? aName : standardLabel(type);
  const savedCustom = isCustom && customs.some((x) => x.name === aName);

  const loadCustoms = useCallback((id: string) => {
    if (!id) { setCustoms([]); return; }
    api.get(`/assessments?subject_id=${id}`).then((r) => setCustoms((r.data || []).map((x: any) => ({ name: x.name, max: Number(x.max_score) })))).catch(() => setCustoms([]));
  }, []);
  const loadSettings = useCallback((id: string, curType: string) => {
    if (!id) { setSettings({}); return; }
    api.get(`/assessment-settings?subject_id=${id}`).then((r) => {
      const map: Record<string, Setting> = {};
      (r.data || []).forEach((x: any) => { map[x.exam_type] = { display_name: x.display_name, max_score: x.max_score }; });
      setSettings(map);
      if (curType !== 'Other') setMaxScore(Number(map[curType]?.max_score ?? DEFAULT_MAX[curType]));
    }).catch(() => setSettings({}));
  }, []);
  useEffect(() => { loadCustoms(classId); loadSettings(classId, type); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [classId]);

  const shownClasses = semester === 'All' ? classes : classes.filter((k) => String(k.semester) === semester);
  const assessmentValue = isCustom ? `custom:${aName}` : type;
  const customOptions = [...customs];
  if (isCustom && aName && !customOptions.some((x) => x.name.toLowerCase() === aName.toLowerCase())) customOptions.push({ name: aName, max: maxScore });

  const closeSheet = () => { setOpen(false); setRoster([]); setScores({}); setFilter(''); };

  const pickAssessment = (v: string) => {
    if (v === '__new__') { setNewName(''); setNewMax('10'); setNewOpen(true); return; }
    if (v.startsWith('custom:')) {
      const name = v.slice(7); const f = customs.find((x) => x.name === name);
      setType('Other'); setAName(name); if (f) setMaxScore(f.max); closeSheet(); return;
    }
    setType(v); setAName(''); setMaxScore(Number(standardMax(v))); closeSheet();
  };

  const createAssessment = () => {
    const name = cleanName(newName); const max = Number(newMax);
    if (!name) { Alert.alert('Name needed', 'Please enter a name, e.g. Viva 1.'); return; }
    if (name.length > 60) { Alert.alert('Name too long', 'Use at most 60 characters.'); return; }
    if (!validMax(max)) { Alert.alert('Check full marks', 'Maximum marks must be a whole number from 1 to 999.'); return; }
    const existing = customs.find((x) => x.name.toLowerCase() === name.toLowerCase());
    setType('Other'); setAName(existing ? existing.name : name); setMaxScore(existing ? existing.max : max);
    closeSheet(); setNewOpen(false);
  };

  const openEdit = () => { setEditName(isCustom ? aName : settings[type]?.display_name || ''); setEditMax(String(maxScore)); setEditReason(''); setEditOpen(true); };
  const submitEdit = async () => {
    const max = Number(editMax); const name = cleanName(editName);
    if (!validMax(max)) { Alert.alert('Check full marks', 'Full marks must be a whole number from 1 to 999.'); return; }
    if (isCustom && !name) { Alert.alert('Name needed', 'Please enter a name.'); return; }
    if (isCustom && !savedCustom) { setAName(name); setMaxScore(max); closeSheet(); setEditOpen(false); return; }
    setEditBusy(true);
    try {
      const res = await api.put('/assessments/edit', { subject_id: classId, exam_type: type, assessment_name: isCustom ? aName : '', new_name: name, max_score: max, reason: editReason.trim() });
      if (isCustom) setAName(res.data.name);
      setMaxScore(Number(res.data.max_score));
      closeSheet(); setEditOpen(false); loadCustoms(classId); loadSettings(classId, type); subjects.refresh();
    } catch (e) { Alert.alert('Could not update the assessment', errorMessage(e)); } finally { setEditBusy(false); }
  };

  const openGrading = async (id: string, t: string, name: string) => {
    if (!id) { Alert.alert('Choose a class', 'Please select a class first.'); return; }
    setOpening(true);
    try {
      const [r, m] = await Promise.all([
        api.get(`/subjects/${id}/students`),
        api.get(`/marks/details?subject_id=${id}&exam_type=${q(t)}&assessment_name=${q(name)}`),
      ]);
      const rs: Student[] = (r.data || []).map((s: any) => ({ id: s.student_id || s.id, name: s.name, roll: s.roll || '' }));
      if (!rs.length) { Alert.alert('No students', 'No students are enrolled in this course yet.'); return; }
      const marks: Detail[] = m.data || [];
      const o: Record<number, number> = {}; const sc: Record<number, string> = {};
      marks.forEach((x) => { const sid = x.student_id || x.id; o[sid] = Number(x.score); sc[sid] = String(Number(x.score)); });
      setOrig(o); setScores(sc); setRoster(rs); setFilter('');
      setOrigMax(marks.length ? Number(marks[0].max_score) : null);
      if (marks.length && marks[0].max_score) setMaxScore(Number(marks[0].max_score));
      setOpen(true);
    } catch (e) { Alert.alert('Could not open the sheet', errorMessage(e)); } finally { setOpening(false); }
  };

  const onScore = useCallback((id: number, raw: string) => {
    const r = cleanScoreText(raw, maxScore);
    if (r.text === null) { if (r.over) { setOver(id); setTimeout(() => setOver((cur) => (cur === id ? null : cur)), 1500); } return; }
    setScores((cur) => ({ ...cur, [id]: r.text as string }));
  }, [maxScore]);

  const requestSave = () => {
    const entered = roster.filter((s) => isEntered(scores[s.id]));
    if (!entered.length) { Alert.alert('Nothing to save', 'Enter at least one score before saving.'); return; }
    const maxChanged = origMax !== null && origMax !== maxScore;
    const changes = entered.filter((s) => orig[s.id] !== undefined && (maxChanged || Number(scores[s.id]) !== orig[s.id]));
    const created = entered.filter((s) => orig[s.id] === undefined);
    setSummary({ entered, changes, created, maxChanged, notEntered: roster.length - entered.length, stats: computeStats(entered.map((s) => Number(scores[s.id])), maxScore) });
    setReason('');
  };

  const save = async () => {
    if (!summary) return;
    if (summary.changes.length > 0 && reason.trim().length < 3) { Alert.alert('Reason needed', 'Please give a reason for changing saved marks.'); return; }
    setSaving(true);
    try {
      const res = await api.post('/marks', {
        subject_id: classId, exam_type: type, assessment_name: isCustom ? aName : '', max_score: maxScore,
        marks: summary.entered.map((s) => ({ id: s.id, score: Number(scores[s.id]) })), reason: reason.trim(),
      });
      setSummary(null); closeSheet(); loadCustoms(classId); subjects.refresh(); setMode('ledger');
      Alert.alert('Marks saved', res.data?.message || 'Changes are recorded in the history.');
    } catch (e) { Alert.alert('Could not save marks', errorMessage(e)); } finally { setSaving(false); }
  };

  const rowLabel = (r: LedgerRow) => r.name || r.display_name || DEFAULT_LABELS[r.type] || r.type;
  const viewRecord = async (r: LedgerRow) => {
    setViewRec(r); setViewRows(null);
    try { const res = await api.get(`/marks/details?subject_id=${r.classId}&exam_type=${q(r.type)}&assessment_name=${q(r.name || '')}`); setViewRows(res.data || []); }
    catch (e) { setViewRec(null); Alert.alert('Could not load records', errorMessage(e)); }
  };
  const editRecord = (r: LedgerRow) => {
    setSemester(r.semester ? String(r.semester) : 'All'); setClassId(String(r.classId)); setType(r.type); setAName(r.name || ''); setMaxScore(r.max); setMode('entry');
    openGrading(String(r.classId), r.type, r.name || '');
  };

  const filteredLedger = ledger.filter((r) => (lSem === 'All' || String(r.semester) === lSem) && (lSubject === 'All' || r.subject.includes(lSubject)));
  const subjectNames = [...new Set(classes.filter((k) => lSem === 'All' || String(k.semester) === lSem).map((k) => k.subject_name))];
  const visibleRoster = useMemo(() => {
    const t = filter.trim().toLowerCase();
    return t ? roster.filter((s) => s.name.toLowerCase().includes(t) || s.roll.toLowerCase().includes(t)) : roster;
  }, [roster, filter]);
  const enteredCount = roster.filter((s) => isEntered(scores[s.id])).length;
  const stats = summary?.stats;

  return (
    <Screen onRefresh={subjects.refresh} refreshing={subjects.refreshing}>
      <Segmented<Mode> options={[{ value: 'entry', label: 'Marks entry' }, { value: 'ledger', label: 'Gradebook' }]} value={mode} onChange={setMode} />

      {subjects.loading && !subjects.data ? <LoadingBlock cards={3} /> : subjects.error && !subjects.data ? <ErrorState message={subjects.error} onRetry={subjects.reload} /> : mode === 'entry' ? (
        <>
          <Card>
            <View style={{ gap: 14 }}>
              <T v="h2">Assessment setup</T>
              <SelectField label="Semester" value={semester} options={semOptions} onChange={(v) => { setSemester(String(v)); setClassId(''); closeSheet(); }} />
              <SelectField label="Class" value={classId} placeholder="Choose a class" onChange={(v) => { setClassId(String(v)); closeSheet(); }}
                options={shownClasses.map((k) => ({ value: String(k.id), label: `${k.subject_name} (Sem ${k.semester})` }))} />
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T v="label">Assessment</T>
                  {classId ? <Pressable onPress={openEdit} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>Edit name / marks</Text></Pressable> : null}
                </View>
                <SelectField value={assessmentValue} onChange={(v) => pickAssessment(String(v))}
                  options={[...STANDARD_TYPES.map((t) => ({ value: t, label: standardLabel(t) })), ...customOptions.map((x) => ({ value: `custom:${x.name}`, label: x.name })), { value: '__new__', label: '+ New custom assessment' }]} />
              </View>
              <T v="small">Full marks: <T v="small" style={{ color: c.text, fontWeight: '700' }}>{maxScore}</T>. Pass mark {PASS_PERCENT}%.</T>
              <Button label="Open grading sheet" icon="document-text-outline" variant="soft" onPress={() => openGrading(classId, type, isCustom ? aName : '')} loading={opening} />
            </View>
          </Card>

          {open ? (
            <Card>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}><T v="h2" numberOfLines={1}>{label}</T><T v="small">{enteredCount} of {roster.length} entered · max {maxScore}</T></View>
                  <Pressable onPress={() => history.open(classId, type, isCustom ? aName : '', `${label} history`)} hitSlop={8} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={16} color={c.warn} /><Text style={{ color: c.warn, fontWeight: '700', fontSize: 13 }}>History</Text>
                  </Pressable>
                </View>
                <SearchInput value={filter} onChange={setFilter} placeholder="Search name or roll no." />
                <T v="small">Leave a score empty to mark the student absent.</T>
                <View>
                  {visibleRoster.map((s) => (
                    <ScoreRow key={s.id} id={s.id} name={s.name} roll={s.roll} value={scores[s.id] ?? ''} max={maxScore} saved={orig[s.id] !== undefined} hint={over === s.id} onChange={onScore} />
                  ))}
                  {visibleRoster.length === 0 ? <EmptyState text="No students match your search." /> : null}
                </View>
                <Button label="Review and save marks" icon="cloud-upload-outline" onPress={requestSave} />
              </View>
            </Card>
          ) : (
            <Card><EmptyState icon="document-text-outline" text="Configure the assessment above and open the sheet to begin grading." /></Card>
          )}
        </>
      ) : (
        <>
          <SelectField label="Semester" value={lSem} options={semOptions} onChange={(v) => { setLSem(String(v)); setLSubject('All'); }} />
          <SelectField label="Subject" value={lSubject} options={[{ value: 'All', label: 'All subjects' }, ...subjectNames.map((n) => ({ value: n, label: n }))]} onChange={(v) => setLSubject(String(v))} />
          {filteredLedger.length === 0 ? <Card><EmptyState icon="school-outline" text="No marks published yet." /></Card> : filteredLedger.map((r, i) => {
            const pct = r.max ? Math.round((r.avg / r.max) * 100) : 0;
            return (
              <Card key={`${r.classId}-${r.type}-${r.name}-${i}`}>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <T v="h2" style={{ flex: 1 }}>{rowLabel(r)}</T>
                    {r.status ? <Badge label={r.status} tone="info" /> : null}
                  </View>
                  <T v="small">{r.subject} · {r.course} · Sem {r.semester} · {r.date}</T>
                  <View style={{ gap: 4 }}>
                    <T v="small" style={{ fontWeight: '700' }}>Class average {r.avg} / {r.max} ({pct}%)</T>
                    <ProgressBar value={r.avg} max={r.max} tone={pct >= 75 ? 'success' : pct >= 50 ? 'warn' : 'danger'} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 20, marginTop: 2 }}>
                    <Pressable onPress={() => viewRecord(r)} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>View</Text></Pressable>
                    <Pressable onPress={() => history.open(r.classId, r.type, r.name, `${r.subject} · ${rowLabel(r)}`)} hitSlop={8}><Text style={{ color: c.warn, fontWeight: '700', fontSize: 13 }}>History</Text></Pressable>
                    <Pressable onPress={() => editRecord(r)} hitSlop={8}><Text style={{ color: c.muted, fontWeight: '700', fontSize: 13 }}>Edit</Text></Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      )}

      {history.sheet}

      <Sheet visible={!!viewRec} title={viewRec ? `${rowLabel(viewRec)} grades` : ''} onClose={() => setViewRec(null)}>
        {viewRec ? <T v="small">{viewRec.subject} · {viewRec.course}</T> : null}
        {!viewRows ? <T v="muted">Loading…</T> : viewRows.length === 0 ? <EmptyState text="No marks recorded." /> : viewRows.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <View style={{ flex: 1 }}><T v="body" style={{ fontWeight: '700' }} numberOfLines={1}>{r.name}</T><T v="small">{r.roll_number || 'No roll no.'}</T></View>
            <T v="body" style={{ fontWeight: '700', color: c.primary }}>{r.score} / {viewRec?.max}</T>
          </View>
        ))}
      </Sheet>

      <Sheet visible={newOpen} title="New custom assessment" onClose={() => setNewOpen(false)}>
        <Field label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. Viva 1" maxLength={60} />
        <Field label="Full marks" value={newMax} onChangeText={(t) => setNewMax(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={3} />
        <Button label="Create assessment" onPress={createAssessment} />
      </Sheet>

      <Sheet visible={editOpen} title="Edit assessment" onClose={() => !editBusy && setEditOpen(false)}>
        <Field label="Name" value={editName} onChangeText={setEditName} placeholder={isCustom ? 'Assessment name' : DEFAULT_LABELS[type]} maxLength={60} />
        <Field label="Full marks" value={editMax} onChangeText={(t) => setEditMax(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={3} />
        {savedCustom || !isCustom ? <Field label="Reason (recorded in history)" value={editReason} onChangeText={setEditReason} maxLength={255} /> : null}
        <Button label="Save" onPress={submitEdit} loading={editBusy} />
      </Sheet>

      <Sheet visible={!!summary} title="Confirm marks" onClose={() => !saving && setSummary(null)}>
        {summary && stats ? (
          <>
            <T v="small">{classes.find((k) => String(k.id) === classId)?.subject_name} · {label} · Max {maxScore} · Pass mark {PASS_PERCENT}% ({Math.ceil((maxScore * PASS_PERCENT) / 100)})</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile label="Students" value={roster.length} />
              <StatTile label="Entered" value={summary.entered.length} tone="info" />
              <StatTile label="Absent" value={summary.notEntered} tone={summary.notEntered ? 'warn' : 'neutral'} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile label="Average" value={stats.avg.toFixed(2)} sub={`${stats.avgPct.toFixed(0)}%`} />
              <StatTile label="Highest" value={stats.highest} tone="success" sub={`of ${maxScore}`} />
              <StatTile label="Lowest" value={stats.lowest} tone="danger" sub={`of ${maxScore}`} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile label="Passed" value={stats.passed} tone="success" />
              <StatTile label="Failed" value={stats.failed} tone={stats.failed ? 'danger' : 'neutral'} />
              <StatTile label="Pass rate" value={`${stats.passRate.toFixed(0)}%`} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile label="New entries" value={summary.created.length} tone="success" />
              <StatTile label="Changed" value={summary.changes.length} tone="warn" />
            </View>
            {summary.changes.length > 0 ? (
              <View style={{ gap: 8 }}>
                {summary.maxChanged ? <Notice tone="warn">{`The maximum score changed from ${origMax} to ${maxScore}.`}</Notice> : null}
                <T v="label">Changes to saved marks</T>
                {summary.changes.map((s) => (
                  <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <T v="body" style={{ flex: 1 }} numberOfLines={1}>{s.name}</T>
                    <T v="body" style={{ fontWeight: '700' }}>{orig[s.id]} → {Number(scores[s.id])}</T>
                  </View>
                ))}
                <Field label="Reason for change *" value={reason} onChangeText={setReason} maxLength={255} placeholder="e.g. Answer sheet re-evaluated" />
              </View>
            ) : null}
            <Button label="Confirm and save" icon="checkmark-circle-outline" onPress={save} loading={saving} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
