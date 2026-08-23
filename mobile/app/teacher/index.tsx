import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import api from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

type TeacherStats = {
  totalSubjects: number;
  totalStudents: number;
  classesConducted: number;
};

type ScheduledClass = {
  class_id: string | number;
  subject_id: string | number;
  subject_code?: string;
  subject_name: string;
  semester?: string | number;
  course_name?: string;
  start_time: string;
  end_time: string;
  room_number?: string | number;
};

type Notice = {
  id: string | number;
  title: string;
  date: string;
  priority?: string;
};

type DashboardData = {
  teacherName: string;
  stats: TeacherStats;
  scheduledClasses: ScheduledClass[];
  notices: Notice[];
};

export default function TeacherDashboard() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const colors = isDark
    ? {
        background: '#020617',
        card: '#0F172A',
        secondary: '#111C31',
        border: '#1E293B',
        text: '#F8FAFC',
        muted: '#94A3B8',
        subtle: '#64748B',
        primary: '#3B82F6',
        primarySoft: '#172554',
        success: '#10B981',
        successSoft: '#052E2B',
        warning: '#F59E0B',
        warningSoft: '#3A2705',
      }
    : {
        background: '#F8FAFC',
        card: '#FFFFFF',
        secondary: '#F1F5F9',
        border: '#E2E8F0',
        text: '#0F172A',
        muted: '#64748B',
        subtle: '#94A3B8',
        primary: '#2563EB',
        primarySoft: '#EFF6FF',
        success: '#10B981',
        successSoft: '#ECFDF5',
        warning: '#F59E0B',
        warningSoft: '#FFFBEB',
      };

  const loadDashboard = useCallback(async (showLoader = true) => {
    try {
      setError('');
      if (showLoader) setLoading(true);

      const storedUser = await getItem('authUser');
      if (!storedUser) {
        setError('Your session could not be restored. Please sign in again.');
        return;
      }

      const user = JSON.parse(storedUser);
      if (!user?.id) {
        setError('Teacher account information is unavailable.');
        return;
      }

      const response = await api.get(`/teacher/${user.id}/dashboard`);
      setDashboardData(response.data);
    } catch (err: any) {
      console.error('TEACHER DASHBOARD ERROR:', err?.response?.data || err?.message || err);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load the teacher dashboard.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard(false);
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loading && !dashboardData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Syncing dashboard...</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="alert-circle-outline" size={34} color={colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Dashboard unavailable</Text>
        <Text style={[styles.errorText, { color: colors.muted }]}>{error || 'Something went wrong.'}</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => loadDashboard()}>
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const stats = dashboardData.stats || { totalSubjects: 0, totalStudents: 0, classesConducted: 0 };
  const classes = Array.isArray(dashboardData.scheduledClasses) ? dashboardData.scheduledClasses : [];
  const notices = Array.isArray(dashboardData.notices) ? dashboardData.notices : [];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>WELCOME</Text>
        <Text style={[styles.title, { color: colors.text }]}><Text style={{ color: colors.primary }}>{dashboardData.teacherName || 'Professor'}</Text></Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Here is your daily teaching overview and scheduled classes.</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="book-outline" label="ASSIGNED SUBJECTS" value={stats.totalSubjects} colors={colors} />
        <StatCard icon="people-outline" label="TOTAL STUDENTS" value={stats.totalStudents} colors={colors} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>QUICK ACTIONS</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="checkbox-outline" label="Attendance" tint={colors.primary} soft={colors.primarySoft} onPress={() => router.push('/teacher/attendance')} />
          <QuickAction icon="document-text-outline" label="Mark Grades" tint={colors.success} soft={colors.successSoft} onPress={() => router.push('/teacher/marks')} />
          <QuickAction icon="megaphone-outline" label="Send Notice" tint={colors.warning} soft={colors.warningSoft} onPress={() => router.push('/teacher/notices')} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>TODAY'S TIMETABLE</Text>
          <Text style={[styles.dateText, { color: colors.text }]}>{todayLabel}</Text>
        </View>
        <View style={[styles.sessionBadge, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.sessionText, { color: colors.primary }]}>{classes.length} SESSIONS</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
        {classes.length > 0 ? (
          classes.map((item, index) => (
            <View key={String(item.class_id ?? index)} style={[styles.classRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.timeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.timeMain, { color: colors.primary }]}>{String(item.start_time).split(' ')[0]}</Text>
                <Text style={[styles.timePeriod, { color: colors.muted }]}>{String(item.start_time).split(' ')[1] || ''}</Text>
              </View>

              <View style={styles.classInfo}>
                <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={2}>
                  {item.subject_name}{item.subject_code ? <Text style={{ color: colors.muted, fontWeight: '600' }}> ({item.subject_code})</Text> : null}
                </Text>
                <View style={styles.metaWrap}>
                  <View style={[styles.metaPill, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="location-outline" size={12} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.text }]}>Room {item.room_number || '—'}</Text>
                  </View>
                  <Text style={[styles.metaPlain, { color: colors.muted }]} numberOfLines={1}>
                    {item.course_name || 'Course'} • Sem {item.semester ?? '—'} • Ends {item.end_time}
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.attendanceButton, { backgroundColor: colors.secondary }]}
                onPress={() => router.push({ pathname: '/teacher/attendance', params: { subject: String(item.subject_id) } })}
              >
                <Ionicons name="checkbox-outline" size={17} color={colors.primary} />
                <Text style={[styles.attendanceText, { color: colors.text }]}>Attendance</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptySchedule}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="time-outline" size={30} color={colors.subtle} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Schedule Clear</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>You have no classes scheduled for today.</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>RECENT UPDATES</Text>
          <Text style={[styles.dateText, { color: colors.text }]}>Latest campus notices</Text>
        </View>
        <Pressable onPress={() => router.push('/teacher/notices')}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
        {notices.length > 0 ? (
          notices.map((notice, index) => (
            <Pressable
              key={String(notice.id)}
              style={[styles.noticeRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
              onPress={() => router.push('/teacher/notices')}
            >
              <View style={[styles.noticeIcon, { backgroundColor: notice.priority === 'high' ? colors.warningSoft : colors.primarySoft }]}>
                <Ionicons name="notifications-outline" size={18} color={notice.priority === 'high' ? colors.warning : colors.primary} />
              </View>
              <View style={styles.noticeBody}>
                <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={2}>{notice.title}</Text>
                <Text style={[styles.noticeDate, { color: colors.muted }]}>{notice.date}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyUpdates}>
            <Ionicons name="mail-open-outline" size={28} color={colors.subtle} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No recent updates</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>You're all caught up.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

type Palette = {
  card: string;
  border: string;
  text: string;
  muted: string;
  secondary: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  subtle: string;
};

function StatCard({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number; colors: Palette }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.statTop}>
        <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
        <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={21} color={colors.primary} />
        </View>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function QuickAction({ icon, label, tint, soft, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; soft: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.quickAction, { backgroundColor: soft }]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={[styles.quickLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36 },
  header: { marginBottom: 18 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginBottom: 4 },
  title: { fontSize: 25, fontWeight: '900', letterSpacing: -0.6, lineHeight: 31 },
  subtitle: { marginTop: 5, fontSize: 12, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, minHeight: 126, borderWidth: 1, borderRadius: 20, padding: 15, justifyContent: 'space-between' },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  statLabel: { flex: 1, fontSize: 8, fontWeight: '900', letterSpacing: 1, lineHeight: 12 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 29, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 22, padding: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.15 },
  quickGrid: { flexDirection: 'row', gap: 9, marginTop: 10 },
  quickAction: { flex: 1, minHeight: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  quickLabel: { marginTop: 7, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 9, paddingHorizontal: 2 },
  dateText: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  sessionBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  sessionText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  classRow: { padding: 14, gap: 12 },
  timeBox: { width: 56, height: 58, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  timeMain: { fontSize: 13, fontWeight: '900' },
  timePeriod: { fontSize: 8, fontWeight: '700', marginTop: 2 },
  classInfo: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: 15, fontWeight: '900', lineHeight: 20 },
  metaWrap: { marginTop: 7, gap: 5 },
  metaPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  metaText: { fontSize: 9, fontWeight: '800' },
  metaPlain: { fontSize: 9, fontWeight: '600' },
  attendanceButton: { alignSelf: 'stretch', minWidth: 92, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', gap: 4 },
  attendanceText: { fontSize: 9, fontWeight: '800', textAlign: 'center' },
  emptySchedule: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '900' },
  emptyText: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 17 },
  viewAll: { fontSize: 10, fontWeight: '900' },
  noticeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 11 },
  noticeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  noticeBody: { flex: 1 },
  noticeTitle: { fontSize: 13, fontWeight: '800', lineHeight: 18 },
  noticeDate: { fontSize: 9, fontWeight: '600', marginTop: 4 },
  emptyUpdates: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 12, fontWeight: '700' },
  errorIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  errorTitle: { fontSize: 18, fontWeight: '900' },
  errorText: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6, maxWidth: 320 },
  retryButton: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});