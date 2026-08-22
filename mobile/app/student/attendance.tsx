import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import api from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

type AttendanceLog = {
  class_date: string;
  subject_name: string;
  status: 'Present' | 'Absent' | 'Late' | string;
};

type Subject = {
  subject_name: string;
};

type AttendanceSubject = {
  name: string;
  present: number;
  late: number;
  absent: number;
  attended: number;
  total: number;
  percentage: number | null;
};

type AttendanceSummary = {
  overall: number;
  attended: number;
  present: number;
  percentage: number;
  late: number;
  absent: number;
  total: number;
  requiredPercentage: number;
  subjects: AttendanceSubject[];
  recentLogs: {
    date: string;
    subject: string;
    status: string;
  }[];
};

type Colors = {
  background: string;
  card: string;
  cardSoft: string;
  text: string;
  muted: string;
  subtle: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  danger: string;
  warning: string;
};

export default function StudentAttendance() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [selectedSemester, setSelectedSemester] = useState<number | null>(
    null
  );
  const [selectedSubject, setSelectedSubject] = useState('All');

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [subjectsFromDb, setSubjectsFromDb] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const colors: Colors = {
    background: isDark ? '#050817' : '#F8FAFC',
    card: isDark ? '#101525' : '#FFFFFF',
    cardSoft: isDark ? '#151D31' : '#F8FAFC',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#66728B' : '#94A3B8',
    border: isDark ? '#202A42' : '#E2E8F0',
    primary: '#1764FF',
    primarySoft: isDark ? '#172554' : '#EFF6FF',
    success: '#18D7A0',
    danger: '#EF4444',
    warning: '#F59E0B',
  };

  const loadSemester = useCallback(async () => {
    try {
      const rawUser = await getItem('authUser');

      if (!rawUser) {
        throw new Error(
          'Your session could not be restored. Please sign in again.'
        );
      }

      const user = JSON.parse(rawUser);
      const userId = user?.id;

      if (!userId) {
        throw new Error('Student account information is unavailable.');
      }

      const response = await api.get(`/student/${userId}/profile`);

      const semesterText = response.data?.academic?.semester || '';

      const currentSemester = Number(
        String(semesterText).replace(/[^0-9]/g, '')
      );

      setSelectedSemester(
        Number.isInteger(currentSemester) && currentSemester > 0
          ? currentSemester
          : 1
      );
    } catch (err: any) {
      console.error(
        'STUDENT ATTENDANCE SEMESTER ERROR:',
        err?.response?.data || err?.message
      );

      setSelectedSemester(1);
    }
  }, []);

  useEffect(() => {
    loadSemester();
  }, [loadSemester]);

  const loadAttendance = useCallback(async () => {
    if (selectedSemester === null) return;

    try {
      setError('');
      setLoading(true);

      const rawUser = await getItem('authUser');

      if (!rawUser) {
        throw new Error(
          'Your session could not be restored. Please sign in again.'
        );
      }

      const user = JSON.parse(rawUser);
      const userId = user?.id;

      if (!userId) {
        throw new Error('Student account information is unavailable.');
      }

      const params = `?semester=${selectedSemester}`;

      const [logsResponse, subjectsResponse] = await Promise.all([
        api.get(`/student/${userId}/attendance-logs${params}`),
        api.get(`/student/${userId}/subjects-list${params}`),
      ]);

      setLogs(
        Array.isArray(logsResponse.data) ? logsResponse.data : []
      );

      setSubjectsFromDb(
        Array.isArray(subjectsResponse.data)
          ? subjectsResponse.data
          : []
      );
    } catch (err: any) {
      console.error(
        'STUDENT ATTENDANCE ERROR:',
        err?.response?.data || err?.message
      );

      setLogs([]);
      setSubjectsFromDb([]);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load attendance records.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSemester]);

  useEffect(() => {
    if (selectedSemester !== null) {
      loadAttendance();
    }
  }, [selectedSemester, loadAttendance]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  const attendanceData = useMemo<AttendanceSummary>(() => {
    const subjects: AttendanceSubject[] = subjectsFromDb.map((subject) => {
      const name = subject.subject_name;

      const subjectLogs = logs.filter(
        (log) => log.subject_name === name
      );

      const present = subjectLogs.filter(
        (log) => log.status === 'Present'
      ).length;

      const late = subjectLogs.filter(
        (log) => log.status === 'Late'
      ).length;

      const absent = subjectLogs.filter(
        (log) => log.status === 'Absent'
      ).length;

      const total = subjectLogs.length;
      const attended = present + late;

      return {
        name,
        present,
        late,
        absent,
        attended,
        total,
        percentage:
          total > 0
            ? Math.round((attended / total) * 100)
            : null,
      };
    });

    const present = logs.filter(
      (log) => log.status === 'Present'
    ).length;

    const late = logs.filter(
      (log) => log.status === 'Late'
    ).length;

    const absent = logs.filter(
      (log) => log.status === 'Absent'
    ).length;

    const total = logs.length;
    const attended = present + late;

    const overallPercentage =
  total > 0
    ? Math.round((attended / total) * 100)
    : 0;

return {
  overall: overallPercentage,
  percentage: overallPercentage,

  attended,
      present,
      late,
      absent,
      total,

      requiredPercentage: 75,

      subjects,

      recentLogs: logs.map((log) => ({
        date: new Date(log.class_date).toLocaleDateString(
          'en-GB',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }
        ),
        subject: log.subject_name,
        status: log.status,
      })),
    };
  }, [logs, subjectsFromDb]);

  const displayedSubjects =
    selectedSubject === 'All'
      ? attendanceData.subjects
      : attendanceData.subjects.filter(
          (subject) => subject.name === selectedSubject
        );

  const displayedLogs =
    selectedSubject === 'All'
      ? attendanceData.recentLogs
      : attendanceData.recentLogs.filter(
          (log) => log.subject === selectedSubject
        );

  const selectedStats =
    selectedSubject === 'All'
      ? attendanceData
      : displayedSubjects[0] || {
          attended: 0,
          present: 0,
          late: 0,
          absent: 0,
          total: 0,
          percentage: null,
        };

  const percentage =
    selectedStats.percentage ??
    (selectedStats.total > 0
      ? Math.round(
          (selectedStats.attended / selectedStats.total) * 100
        )
      : 0);

  const isSafe =
    percentage >= attendanceData.requiredPercentage;

  if (loading || selectedSemester === null) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            { color: colors.muted },
          ]}
        >
          Loading attendance...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.errorIcon,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={28}
            color={colors.primary}
          />
        </View>

        <Text
          style={[
            styles.errorTitle,
            { color: colors.text },
          ]}
        >
          Attendance unavailable
        </Text>

        <Text
          style={[
            styles.errorText,
            { color: colors.muted },
          ]}
        >
          {error}
        </Text>

        <Pressable
          onPress={loadAttendance}
          style={[
            styles.retryButton,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.backButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={colors.text}
              />
            </Pressable>

            <View>
              <Text
                style={[
                  styles.title,
                  { color: colors.text },
                ]}
              >
                Attendance
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  { color: colors.muted },
                ]}
              >
                Track your academic presence
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.filters}>
          <View
            style={[
              styles.filterBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.primary}
            />

            <Text
              style={[
                styles.filterLabel,
                { color: colors.muted },
              ]}
            >
              Semester
            </Text>

            <View style={styles.semesterButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(
                (semester) => (
                  <Pressable
                    key={semester}
                    onPress={() => {
                      setSelectedSemester(semester);
                      setSelectedSubject('All');
                    }}
                    style={[
                      styles.semesterButton,
                      {
                        backgroundColor:
                          selectedSemester === semester
                            ? colors.primary
                            : colors.cardSoft,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.semesterButtonText,
                        {
                          color:
                            selectedSemester === semester
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {semester}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.subjectFilter,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.filterHeader}>
            <Ionicons
              name="book-outline"
              size={18}
              color={colors.primary}
            />

            <Text
              style={[
                styles.filterTitle,
                { color: colors.text },
              ]}
            >
              Subject
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectScroll}
          >
            <Pressable
              onPress={() => setSelectedSubject('All')}
              style={[
                styles.subjectChip,
                {
                  backgroundColor:
                    selectedSubject === 'All'
                      ? colors.primary
                      : colors.cardSoft,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  {
                    color:
                      selectedSubject === 'All'
                        ? '#FFFFFF'
                        : colors.text,
                  },
                ]}
              >
                All Subjects
              </Text>
            </Pressable>

            {attendanceData.subjects.map(
              (subject) => (
                <Pressable
                  key={subject.name}
                  onPress={() =>
                    setSelectedSubject(subject.name)
                  }
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor:
                        selectedSubject === subject.name
                          ? colors.primary
                          : colors.cardSoft,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.subjectChipText,
                      {
                        color:
                          selectedSubject === subject.name
                            ? '#FFFFFF'
                            : colors.text,
                      },
                    ]}
                  >
                    {subject.name}
                  </Text>
                </Pressable>
              )
            )}
          </ScrollView>
        </View>

        <View
          style={[
            styles.overallCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.overallLeft}>
            <Text
              style={[
                styles.eyebrow,
                { color: colors.subtle },
              ]}
            >
              {selectedSubject === 'All'
                ? 'OVERALL ATTENDANCE'
                : 'SUBJECT ATTENDANCE'}
            </Text>

            <Text
              style={[
                styles.percentage,
                {
                  color: isSafe
                    ? colors.success
                    : colors.danger,
                },
              ]}
            >
              {percentage}%
            </Text>

            <Text
              style={[
                styles.requiredText,
                { color: colors.muted },
              ]}
            >
              Required: {attendanceData.requiredPercentage}%
            </Text>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isSafe
                    ? isDark
                      ? '#052E2B'
                      : '#ECFDF5'
                    : isDark
                      ? '#35101A'
                      : '#FEF2F2',
                },
              ]}
            >
              <Ionicons
                name={
                  isSafe
                    ? 'checkmark-circle'
                    : 'warning-outline'
                }
                size={14}
                color={
                  isSafe
                    ? colors.success
                    : colors.danger
                }
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: isSafe
                      ? colors.success
                      : colors.danger,
                  },
                ]}
              >
                {isSafe
                  ? 'Attendance is safe'
                  : 'Attendance below requirement'}
              </Text>
            </View>
          </View>

          <AttendanceRing
            percentage={percentage}
            colors={colors}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="checkmark-circle-outline"
            label="Attended"
            value={selectedStats.attended}
            caption="Classes attended"
            color={colors.success}
            colors={colors}
          />

          <StatCard
            icon="close-circle-outline"
            label="Absent"
            value={selectedStats.absent}
            caption="Classes missed"
            color={colors.danger}
            colors={colors}
          />

          <StatCard
            icon="time-outline"
            label="Late"
            value={selectedStats.late}
            caption="Late arrivals"
            color={colors.warning}
            colors={colors}
          />

          <StatCard
            icon="school-outline"
            label="Classes Held"
            value={selectedStats.total}
            caption="Total classes"
            color={colors.primary}
            colors={colors}
          />
        </View>

        <SectionHeader
          title="Subject-wise Attendance"
          subtitle={`SEMESTER ${selectedSemester}`}
          colors={colors}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {displayedSubjects.map(
            (subject, index) => {
              const safe =
                subject.percentage !== null &&
                subject.percentage >=
                  attendanceData.requiredPercentage;

              return (
                <View key={subject.name}>
                  <View style={styles.subjectRow}>
                    <View
                      style={[
                        styles.subjectIcon,
                        {
                          backgroundColor:
                            colors.primarySoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name="book-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.subjectInfo}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.subjectName,
                          { color: colors.text },
                        ]}
                      >
                        {subject.name}
                      </Text>

                      <Text
                        style={[
                          styles.subjectDetail,
                          { color: colors.muted },
                        ]}
                      >
                        {subject.attended} attended •{' '}
                        {subject.total} held
                      </Text>
                    </View>

                    <View style={styles.subjectPercentage}>
                      <Text
                        style={[
                          styles.subjectPercentageText,
                          {
                            color:
                              subject.percentage === null
                                ? colors.subtle
                                : safe
                                  ? colors.success
                                  : colors.danger,
                          },
                        ]}
                      >
                        {subject.percentage === null
                          ? '—'
                          : `${subject.percentage}%`}
                      </Text>

                      {subject.total > 0 && (
                        <Text
                          style={[
                            styles.subjectStatus,
                            {
                              color: safe
                                ? colors.success
                                : colors.danger,
                            },
                          ]}
                        >
                          {safe
                            ? 'Safe'
                            : 'Below 75%'}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.subjectStats}>
                    <MiniStat
                      label="Present"
                      value={subject.present}
                      color={colors.success}
                      colors={colors}
                    />

                    <MiniStat
                      label="Late"
                      value={subject.late}
                      color={colors.warning}
                      colors={colors}
                    />

                    <MiniStat
                      label="Absent"
                      value={subject.absent}
                      color={colors.danger}
                      colors={colors}
                    />
                  </View>

                  {index <
                    displayedSubjects.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        {
                          backgroundColor:
                            colors.border,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            }
          )}

          {displayedSubjects.length === 0 && (
            <EmptyState
              icon="book-outline"
              title="No subjects found"
              message="No subjects have been added for this semester."
              colors={colors}
            />
          )}
        </View>

        <SectionHeader
          title="Attendance History"
          subtitle="DETAILED CLASS RECORD"
          colors={colors}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {displayedLogs.map(
            (log, index) => {
              const present =
                log.status === 'Present';
              const late =
                log.status === 'Late';

              const statusColor = present
                ? colors.success
                : late
                  ? colors.warning
                  : colors.danger;

              const statusBackground = present
                ? isDark
                  ? '#052E2B'
                  : '#ECFDF5'
                : late
                  ? isDark
                    ? '#3A2708'
                    : '#FFFBEB'
                  : isDark
                    ? '#35101A'
                    : '#FEF2F2';

              return (
                <View key={`${log.date}-${log.subject}-${index}`}>
                  <View style={styles.historyRow}>
                    <View
                      style={[
                        styles.historyIcon,
                        {
                          backgroundColor:
                            colors.primarySoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.historyInfo}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.historySubject,
                          { color: colors.text },
                        ]}
                      >
                        {log.subject}
                      </Text>

                      <Text
                        style={[
                          styles.historyDate,
                          { color: colors.muted },
                        ]}
                      >
                        {log.date}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            statusBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusColor },
                        ]}
                      >
                        {log.status}
                      </Text>
                    </View>
                  </View>

                  {index <
                    displayedLogs.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        {
                          backgroundColor:
                            colors.border,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            }
          )}

          {displayedLogs.length === 0 && (
            <EmptyState
              icon="calendar-outline"
              title="No attendance records"
              message="No attendance records were found for the selected filter."
              colors={colors}
            />
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}


function AttendanceRing({
  percentage,
  colors,
}: {
  percentage: number;
  colors: Colors;
}) {
  const safe = percentage >= 75;

  return (
    <View
      style={[
        styles.ring,
        {
          borderColor: safe
            ? colors.success
            : colors.danger,
        },
      ]}
    >
      <View
        style={[
          styles.ringInner,
          { backgroundColor: colors.cardSoft },
        ]}
      >
        <Ionicons
          name={
            safe
              ? 'checkmark-circle-outline'
              : 'warning-outline'
          }
          size={28}
          color={
            safe ? colors.success : colors.danger
          }
        />
      </View>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  caption,
  color,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  caption: string;
  color: string;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          { backgroundColor: colors.primarySoft },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.statLabel,
          { color: colors.subtle },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.statValue,
          { color: colors.text },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statCaption,
          { color: colors.muted },
        ]}
      >
        {caption}
      </Text>
    </View>
  );
}

function MiniStat({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: number;
  color: string;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.miniStat,
        {
          backgroundColor: colors.cardSoft,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.miniStatValue,
          { color },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.miniStatLabel,
          { color: colors.muted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle: string;
  colors: Colors;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.text },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.sectionSubtitle,
          { color: colors.subtle },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  colors: Colors;
}) {
  return (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={25}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.emptyTitle,
          { color: colors.text },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.emptyMessage,
          { color: colors.muted },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
  },

  errorText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },

  retryButton: {
    marginTop: 22,
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
  },

  subtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  filters: {
    marginBottom: 12,
  },

  filterBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },

  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 7,
    marginBottom: 9,
  },

  semesterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  semesterButton: {
    minWidth: 38,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  semesterButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },

  subjectFilter: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    marginBottom: 18,
  },

  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 11,
    gap: 8,
  },

  filterTitle: {
    fontSize: 13,
    fontWeight: '800',
  },

  subjectScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },

  subjectChip: {
    maxWidth: 210,
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
  },

  subjectChipText: {
    fontSize: 11,
    fontWeight: '800',
  },

  overallCard: {
    minHeight: 190,
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  overallLeft: {
    flex: 1,
    paddingRight: 10,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  percentage: {
    fontSize: 43,
    fontWeight: '900',
    marginTop: 4,
  },

  requiredText: {
    fontSize: 11,
    fontWeight: '600',
  },

  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    marginTop: 12,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },

  ring: {
    width: 105,
    height: 105,
    borderRadius: 53,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ringInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },

  statCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 145,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  statValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },

  statCaption: {
    fontSize: 10,
    marginTop: 2,
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  sectionSubtitle: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 3,
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 26,
  },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 15,
    paddingBottom: 10,
  },

  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  subjectInfo: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 8,
  },

  subjectName: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },

  subjectDetail: {
    fontSize: 10,
    marginTop: 3,
  },

  subjectPercentage: {
    alignItems: 'flex-end',
  },

  subjectPercentageText: {
    fontSize: 18,
    fontWeight: '900',
  },

  subjectStatus: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },

  subjectStats: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 15,
  },

  miniStat: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  miniStatValue: {
    fontSize: 14,
    fontWeight: '900',
  },

  miniStatLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },

  divider: {
    height: 1,
    marginLeft: 65,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  historyInfo: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 7,
  },

  historySubject: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },

  historyDate: {
    fontSize: 10,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 40,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
  },

  emptyMessage: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
  },

  bottomSpace: {
    height: 20,
  },
});