import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import api from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

type Subject = {
  id: number | string;
  subject_code?: string | null;
  subject_name?: string | null;
  course_name?: string | null;
  semester?: number | string | null;
  credits?: number | string | null;
  enrolled_count?: number | string | null;
};

type Colors = {
  background: string;
  card: string;
  soft: string;
  text: string;
  muted: string;
  subtle: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
};

const todayISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export default function TeacherSubjects() {
  const { isDark } = useAppTheme();

  const colors: Colors = {
    background: isDark ? '#050817' : '#F8FAFC',
    card: isDark ? '#101525' : '#FFFFFF',
    soft: isDark ? '#151D31' : '#F8FAFC',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#66728B' : '#94A3B8',
    border: isDark ? '#202A42' : '#E2E8F0',
    primary: '#1764FF',
    primarySoft: isDark ? '#172554' : '#EFF6FF',
    success: '#18D7A0',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [teacherId, setTeacherId] = useState<number | string | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [schedule, setSchedule] = useState({
    date: todayISO(),
    startTime: '09:00',
    endTime: '10:00',
    room: '',
  });
  const [scheduling, setScheduling] = useState(false);

  const loadSubjects = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError('');

      const rawUser = await getItem('authUser');
      if (!rawUser) throw new Error('Your session could not be restored. Please sign in again.');

      const user = JSON.parse(rawUser);
      if (!user?.id) throw new Error('Teacher account information is unavailable.');

      setTeacherId(user.id);

      const response = await api.get(`/teacher/${user.id}/assigned-subjects`);
      setSubjects(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('TEACHER SUBJECTS ERROR:', err?.response?.data || err?.message);
      setSubjects([]);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load your assigned subjects.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subjects;

    return subjects.filter((subject) =>
      [subject.subject_name, subject.subject_code, subject.course_name, String(subject.semester ?? '')]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [search, subjects]);

  const totalStudents = useMemo(
    () => subjects.reduce((sum, subject) => sum + Number(subject.enrolled_count || 0), 0),
    [subjects]
  );

  const openSchedule = (subject: Subject) => {
    setSelectedSubject(subject);
    setSchedule({ date: todayISO(), startTime: '09:00', endTime: '10:00', room: '' });
    setScheduleOpen(true);
  };

  const closeSchedule = () => {
    if (scheduling) return;
    setScheduleOpen(false);
    setSelectedSubject(null);
  };

  const submitSchedule = async () => {
    if (!teacherId || !selectedSubject) return;

    const date = schedule.date.trim();
    const startTime = schedule.startTime.trim();
    const endTime = schedule.endTime.trim();
    const room = schedule.room.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Invalid date', 'Use the date format YYYY-MM-DD.');
      return;
    }

    if (!validTime(startTime) || !validTime(endTime)) {
      Alert.alert('Invalid time', 'Use 24-hour time such as 09:00 or 14:30.');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Invalid schedule', 'End time must be later than start time.');
      return;
    }

    if (!room) {
      Alert.alert('Room required', 'Enter the room or venue for this class.');
      return;
    }

    try {
      setScheduling(true);

      await api.post('/teacher/schedule-class', {
        userId: teacherId,
        subjectId: selectedSubject.id,
        date,
        startTime,
        endTime,
        room,
      });

      Alert.alert('Class scheduled', `${selectedSubject.subject_name || 'Class'} has been scheduled successfully.`);
      closeSchedule();
    } catch (err: any) {
      console.error('TEACHER SCHEDULE ERROR:', err?.response?.data || err?.message);
      Alert.alert(
        'Unable to schedule class',
        err?.response?.data?.error || err?.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setScheduling(false);
    }
  };

  const renderHeader = () => (
    <>
      <View style={styles.pageHeader}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="book-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>My Subjects</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Manage your assigned curriculum and classes.</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.statLabel, { color: colors.muted }]}>ASSIGNED SUBJECTS</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{subjects.length}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: isDark ? '#063B34' : '#ECFDF5' }]}>
            <Ionicons name="people-outline" size={20} color={colors.success} />
          </View>
          <Text style={[styles.statLabel, { color: colors.muted }]}>TOTAL STUDENTS</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalStudents}</Text>
        </View>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={19} color={colors.subtle} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search your subjects..."
          placeholderTextColor={colors.subtle}
          style={[styles.searchInput, { color: colors.text }]}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {!!search && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={19} color={colors.subtle} />
          </Pressable>
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSubjects(false);
            }}
            tintColor={colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.muted }]}>Loading your subjects...</Text>
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: isDark ? '#3B1515' : '#FEF2F2' }]}>
              <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Unable to load subjects</Text>
            <Text style={[styles.stateText, { color: colors.muted }]}>{error}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => loadSubjects()}>
              <Ionicons name="refresh-outline" size={17} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : filteredSubjects.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stateIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="book-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>No subjects found</Text>
            <Text style={[styles.stateText, { color: colors.muted }]}>Try another search or check your assigned subjects later.</Text>
          </View>
        ) : (
          <View style={styles.subjectList}>
            {filteredSubjects.map((subject) => {
              const enrolled = Number(subject.enrolled_count || 0);

              return (
                <View key={String(subject.id)} style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.subjectTop}>
                    <View style={[styles.subjectIcon, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="book-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.subjectTitleWrap}>
                      <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={2}>
                        {subject.subject_name || 'Unnamed Subject'}
                      </Text>
                      <Text style={[styles.subjectCode, { color: colors.muted }]}>
                        {subject.subject_code || 'No subject code'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Ionicons name="school-outline" size={16} color={colors.subtle} />
                      <View style={styles.metaTextWrap}>
                        <Text style={[styles.metaLabel, { color: colors.subtle }]}>COURSE</Text>
                        <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>{subject.course_name || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="layers-outline" size={16} color={colors.subtle} />
                      <View style={styles.metaTextWrap}>
                        <Text style={[styles.metaLabel, { color: colors.subtle }]}>SEMESTER</Text>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{subject.semester ?? '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="ribbon-outline" size={16} color={colors.subtle} />
                      <View style={styles.metaTextWrap}>
                        <Text style={[styles.metaLabel, { color: colors.subtle }]}>CREDITS</Text>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{subject.credits ?? '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={16} color={colors.subtle} />
                      <View style={styles.metaTextWrap}>
                        <Text style={[styles.metaLabel, { color: colors.subtle }]}>ENROLLED</Text>
                        <Text style={[styles.metaValue, { color: colors.text }]}>{enrolled}</Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => openSchedule(subject)}
                    style={({ pressed }) => [
                      styles.scheduleButton,
                      { backgroundColor: colors.primarySoft },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={[styles.scheduleText, { color: colors.primary }]}>Schedule Class</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={scheduleOpen} transparent animationType="slide" onRequestClose={closeSchedule}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}> 
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule Class</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]} numberOfLines={1}>
                  {selectedSubject?.subject_name || 'Selected subject'}
                </Text>
              </View>
              <Pressable onPress={closeSchedule} disabled={scheduling} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Field label="DATE" value={schedule.date} onChangeText={(value) => setSchedule((prev) => ({ ...prev, date: value }))} placeholder="YYYY-MM-DD" colors={colors} />

              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Field label="START TIME" value={schedule.startTime} onChangeText={(value) => setSchedule((prev) => ({ ...prev, startTime: value }))} placeholder="09:00" colors={colors} keyboardType="numbers-and-punctuation" />
                </View>
                <View style={styles.timeField}>
                  <Field label="END TIME" value={schedule.endTime} onChangeText={(value) => setSchedule((prev) => ({ ...prev, endTime: value }))} placeholder="10:00" colors={colors} keyboardType="numbers-and-punctuation" />
                </View>
              </View>

              <Field label="ROOM / VENUE" value={schedule.room} onChangeText={(value) => setSchedule((prev) => ({ ...prev, room: value }))} placeholder="e.g. Lab 4" colors={colors} autoCapitalize="words" />

              <View style={[styles.modalHint, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.modalHintText, { color: colors.muted }]}>Use 24-hour time. Example: 14:30 for 2:30 PM.</Text>
              </View>

              <Pressable
                onPress={submitSchedule}
                disabled={scheduling}
                style={({ pressed }) => [styles.confirmButton, { backgroundColor: colors.primary }, pressed && styles.pressed, scheduling && styles.disabled]}
              >
                {scheduling ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="calendar-outline" size={19} color="#FFFFFF" />}
                <Text style={styles.confirmText}>{scheduling ? 'Scheduling...' : 'Confirm Schedule'}</Text>
              </Pressable>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  keyboardType,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: Colors;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.fieldInput, { backgroundColor: colors.soft, borderColor: colors.border, color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  headerIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, minHeight: 128, borderWidth: 1, borderRadius: 18, padding: 14, justifyContent: 'space-between' },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  statLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 8 },
  statValue: { fontSize: 27, fontWeight: '900', marginTop: 2 },
  searchBox: { height: 50, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 9, fontSize: 14, fontWeight: '600', paddingVertical: 0 },
  subjectList: { gap: 14 },
  subjectCard: { borderWidth: 1, borderRadius: 20, padding: 15 },
  subjectTop: { flexDirection: 'row', alignItems: 'center' },
  subjectIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subjectTitleWrap: { flex: 1, marginLeft: 12 },
  subjectName: { fontSize: 17, fontWeight: '900', lineHeight: 21 },
  subjectCode: { marginTop: 4, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  divider: { height: 1, marginVertical: 14 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  metaItem: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  metaTextWrap: { flex: 1, marginLeft: 8 },
  metaLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  metaValue: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  scheduleButton: { height: 46, borderRadius: 13, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scheduleText: { fontSize: 13, fontWeight: '900' },
  centerState: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  stateCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', marginTop: 4 },
  stateIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stateTitle: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  stateText: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18, marginTop: 6 },
  retryButton: { height: 42, borderRadius: 12, paddingHorizontal: 18, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.58)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '88%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  modalTitleWrap: { flex: 1 },
  modalTitle: { fontSize: 21, fontWeight: '900' },
  modalSubtitle: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  fieldInput: { height: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 14, fontWeight: '700' },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  modalHint: { borderWidth: 1, borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  modalHintText: { flex: 1, fontSize: 10, fontWeight: '600', lineHeight: 15 },
  confirmButton: { height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.6 },
});