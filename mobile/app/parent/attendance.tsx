import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import api from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

type Ward = {
  student_id: string | number;
  user_id?: string | number;
  full_name: string;
  course_name?: string;
  semester?: string | number;
  roll_no?: string | number;
  roll_number?: string | number;
  enrollment_no?: string | number;
};

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

const REQUIRED_PERCENTAGE = 75;

export default function ParentAttendance() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  const [selectedSemester, setSelectedSemester] = useState<number | null>(
    null
  );
  const [selectedSubject, setSelectedSubject] = useState('All');

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [wardPickerOpen, setWardPickerOpen] = useState(false);
  const [loadingWard, setLoadingWard] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
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

  const rollNumber = (ward: Ward | null) =>
    ward?.roll_no ?? ward?.roll_number ?? ward?.enrollment_no ?? null;

  const loadWard = useCallback(async () => {
    try {
      setError('');
      setLoadingWard(true);

      const rawUser = await getItem('authUser');

      if (!rawUser) {
        throw new Error(
          'Your session could not be restored. Please sign in again.'
        );
      }

      const parent = JSON.parse(rawUser);

      if (!parent?.id) {
        throw new Error('Parent account information is unavailable.');
      }

      const url = selectedWardId
        ? `/parent/${parent.id}/wards-overview?student_id=${selectedWardId}`
        : `/parent/${parent.id}/wards-overview`;

      const response = await api.get(url);
      const data = response.data || {};

      const availableWards: Ward[] = Array.isArray(data.allWards)
        ? data.allWards
        : [];

      setWards(availableWards);

      if (!data.childProfile) {
        setSelectedWard(null);
        setSelectedSemester(null);
        setLogs([]);
        setSubjects([]);
        setError('No active students are linked to your parent account.');
        return;
      }

      const child: Ward = {
        ...data.childProfile,
        student_id: data.childProfile.student_id,
        user_id: data.childProfile.user_id,
        full_name: data.childProfile.full_name,
      };

      setSelectedWard(child);

      if (!selectedWardId) {
        setSelectedWardId(String(child.student_id));
      }

      const semester = Number(child.semester);
      setSelectedSemester(
        Number.isInteger(semester) && semester > 0 ? semester : 1
      );
      setSelectedSubject('All');
    } catch (err: any) {
      console.error(
        'PARENT ATTENDANCE WARD ERROR:',
        err?.response?.data || err?.message || err
      );

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load ward information.'
      );
    } finally {
      setLoadingWard(false);
    }
  }, [selectedWardId]);

  const loadAttendance = useCallback(async () => {
    if (!selectedWard?.user_id || selectedSemester === null) return;

    try {
      setError('');
      setLoadingAttendance(true);

      const childUserId = selectedWard.user_id;
      const params = `?semester=${selectedSemester}`;

      const [logsResponse, subjectsResponse] = await Promise.all([
        api.get(`/student/${childUserId}/attendance-logs${params}`),
        api.get(`/student/${childUserId}/subjects-list${params}`),
      ]);

      setLogs(
        Array.isArray(logsResponse.data) ? logsResponse.data : []
      );

      setSubjects(
        Array.isArray(subjectsResponse.data)
          ? subjectsResponse.data
          : []
      );
    } catch (err: any) {
      console.error(
        'PARENT ATTENDANCE ERROR:',
        err?.response?.data || err?.message || err
      );

      setLogs([]);
      setSubjects([]);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load attendance records.'
      );
    } finally {
      setLoadingAttendance(false);
      setRefreshing(false);
    }
  }, [selectedWard, selectedSemester]);

  useFocusEffect(
    useCallback(() => {
      loadWard();
    }, [loadWard])
  );

  useEffect(() => {
    if (selectedWard?.user_id && selectedSemester !== null) {
      loadAttendance();
    }
  }, [selectedWard?.user_id, selectedSemester, loadAttendance]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWard();
  };

  const handleWardChange = (wardId: string) => {
    if (wardId === selectedWardId) {
      setWardPickerOpen(false);
      return;
    }

    setSelectedWardId(wardId);
    setSelectedWard(null);
    setSelectedSemester(null);
    setSelectedSubject('All');
    setLogs([]);
    setSubjects([]);
    setWardPickerOpen(false);
  };

  const attendanceData = useMemo(() => {
    const subjectStats: AttendanceSubject[] = subjects.map((subject) => {
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

    return {
      present,
      late,
      absent,
      total,
      attended,
      percentage:
        total > 0 ? Math.round((attended / total) * 100) : 0,
      subjects: subjectStats,
    };
  }, [logs, subjects]);

  const displayedSubjects =
    selectedSubject === 'All'
      ? attendanceData.subjects
      : attendanceData.subjects.filter(
          (subject) => subject.name === selectedSubject
        );

  const displayedLogs =
    selectedSubject === 'All'
      ? logs
      : logs.filter(
          (log) => log.subject_name === selectedSubject
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

  const isSafe = percentage >= REQUIRED_PERCENTAGE;

  const formatDate = (value?: string) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loadingWard || selectedSemester === null) {
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
          Loading ward attendance...
        </Text>
      </View>
    );
  }

  if (!selectedWard) {
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
            name="people-outline"
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
          No Ward Selected
        </Text>

        <Text
          style={[
            styles.errorText,
            { color: colors.muted },
          ]}
        >
          {error || 'No student is currently linked to your account.'}
        </Text>

        <Pressable
          onPress={loadWard}
          style={[
            styles.retryButton,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (error && !loadingAttendance && logs.length === 0 && subjects.length === 0) {
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
          <Text style={styles.retryText}>Try Again</Text>
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
                Monitor your ward's academic presence
              </Text>
            </View>
          </View>
        </View>

        {/* WARD SELECTOR */}
        <View
          style={[
            styles.wardCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.wardCardHeader}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <View style={styles.wardHeaderText}>
              <Text
                style={[
                  styles.eyebrow,
                  { color: colors.subtle },
                ]}
              >
                SELECT WARD
              </Text>

              <Text
                style={[
                  styles.wardName,
                  { color: colors.text },
                ]}
                numberOfLines={1}
              >
                {selectedWard.full_name}
              </Text>

              <Text
                style={[
                  styles.wardMeta,
                  { color: colors.muted },
                ]}
                numberOfLines={1}
              >
                {selectedWard.course_name || 'Student'}
                {rollNumber(selectedWard) !== null
                  ? ` • Roll No. ${rollNumber(selectedWard)}`
                  : ''}
              </Text>
            </View>

            <Pressable
              onPress={() => setWardPickerOpen(true)}
              style={[
                styles.changeWardButton,
                {
                  backgroundColor: colors.cardSoft,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.text}
              />
            </Pressable>
          </View>
        </View>

        {/* WARD PICKER */}
        <Modal
          visible={wardPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setWardPickerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setWardPickerOpen(false)}
            />

            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: colors.text },
                    ]}
                  >
                    Select Ward
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: colors.muted },
                    ]}
                  >
                    Choose the student you want to view
                  </Text>
                </View>

                <Pressable
                  onPress={() => setWardPickerOpen(false)}
                  style={[
                    styles.modalClose,
                    {
                      backgroundColor: colors.cardSoft,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={colors.text}
                  />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.wardOptions}
              >
                {wards.map((ward) => {
                  const active =
                    String(ward.student_id) ===
                    String(selectedWardId);

                  const wardRoll = rollNumber(ward);

                  return (
                    <Pressable
                      key={String(ward.student_id)}
                      onPress={() =>
                        handleWardChange(
                          String(ward.student_id)
                        )
                      }
                      style={[
                        styles.wardOption,
                        {
                          backgroundColor: active
                            ? colors.primarySoft
                            : colors.cardSoft,
                          borderColor: active
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.wardOptionIcon,
                          {
                            backgroundColor: active
                              ? colors.primary
                              : colors.card,
                          },
                        ]}
                      >
                        <Ionicons
                          name="person-outline"
                          size={19}
                          color={
                            active
                              ? '#FFFFFF'
                              : colors.primary
                          }
                        />
                      </View>

                      <View style={styles.wardOptionBody}>
                        <Text
                          style={[
                            styles.wardOptionName,
                            { color: colors.text },
                          ]}
                        >
                          {ward.full_name}
                        </Text>

                        <Text
                          style={[
                            styles.wardOptionMeta,
                            { color: colors.muted },
                          ]}
                        >
                          {ward.course_name || 'Student'}
                          {wardRoll !== null
                            ? ` • Roll No. ${wardRoll}`
                            : ''}
                        </Text>
                      </View>

                      {active && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.primary}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* SEMESTER */}
        <View
          style={[
            styles.filterBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.filterHeader}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.primary}
            />
            <Text
              style={[
                styles.filterTitle,
                { color: colors.text },
              ]}
            >
              Semester
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.semesterScroll}
          >
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
          </ScrollView>
        </View>

        {/* SUBJECT FILTER */}
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

            {attendanceData.subjects.map((subject) => (
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
            ))}
          </ScrollView>
        </View>

        {/* SELECTED WARD */}
        <View
          style={[
            styles.wardIdentity,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.identityAvatar,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.identityAvatarText}>
              {selectedWard.full_name
                ?.charAt(0)
                ?.toUpperCase() || 'S'}
            </Text>
          </View>

          <View style={styles.identityBody}>
            <Text
              style={[
                styles.identityLabel,
                { color: colors.muted },
              ]}
            >
              VIEWING ATTENDANCE FOR
            </Text>

            <Text
              style={[
                styles.identityName,
                { color: colors.text },
              ]}
              numberOfLines={1}
            >
              {selectedWard.full_name}
            </Text>

            <Text
              style={[
                styles.identityMeta,
                { color: colors.muted },
              ]}
            >
              Semester {selectedSemester}
              {rollNumber(selectedWard) !== null
                ? ` • Roll No. ${rollNumber(selectedWard)}`
                : ''}
            </Text>
          </View>
        </View>

        {loadingAttendance ? (
          <View
            style={[
              styles.inlineLoading,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
            <Text
              style={[
                styles.inlineLoadingText,
                { color: colors.muted },
              ]}
            >
              Loading attendance records...
            </Text>
          </View>
        ) : null}

        {/* OVERALL CARD */}
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
              Required: {REQUIRED_PERCENTAGE}%
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

        {/* STATS */}
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
            icon="calendar-outline"
            label="Total"
            value={selectedStats.total}
            caption="Classes held"
            color={colors.primary}
            colors={colors}
          />
        </View>

        {/* SUBJECT BREAKDOWN */}
        <SectionTitle
          title="Subject Breakdown"
          subtitle="Attendance performance by subject"
          colors={colors}
        />

        <View
          style={[
            styles.listCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {displayedSubjects.length > 0 ? (
            displayedSubjects.map((subject) => {
              const subjectSafe =
                (subject.percentage ?? 0) >=
                REQUIRED_PERCENTAGE;

              return (
                <View
                  key={subject.name}
                  style={[
                    styles.subjectRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.subjectRowBody}>
                    <Text
                      style={[
                        styles.subjectName,
                        { color: colors.text },
                      ]}
                      numberOfLines={2}
                    >
                      {subject.name}
                    </Text>

                    <Text
                      style={[
                        styles.subjectMeta,
                        { color: colors.muted },
                      ]}
                    >
                      {subject.attended}/{subject.total}{' '}
                      attended
                      {subject.late > 0
                        ? ` • ${subject.late} late`
                        : ''}
                    </Text>

                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(
                              subject.percentage ?? 0,
                              100
                            )}%`,
                            backgroundColor: subjectSafe
                              ? colors.success
                              : colors.danger,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.subjectPercentageBox}>
                    <Text
                      style={[
                        styles.subjectPercentage,
                        {
                          color: subjectSafe
                            ? colors.success
                            : colors.danger,
                        },
                      ]}
                    >
                      {subject.percentage ?? 0}%
                    </Text>

                    <Text
                      style={[
                        styles.subjectStatus,
                        { color: colors.muted },
                      ]}
                    >
                      {subjectSafe ? 'Safe' : 'Short'}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <EmptyState
              icon="book-outline"
              title="No subject data"
              message="No attendance records were found for this semester."
              colors={colors}
            />
          )}
        </View>

        {/* RECENT HISTORY */}
        <SectionTitle
          title="Attendance History"
          subtitle="Detailed class-by-class attendance record"
          colors={colors}
        />

        <View
          style={[
            styles.listCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {displayedLogs.length > 0 ? (
            [...displayedLogs]
              .sort(
                (a, b) =>
                  new Date(b.class_date).getTime() -
                  new Date(a.class_date).getTime()
              )
              .map((log, index) => {
                const present = log.status === 'Present';
                const late = log.status === 'Late';

                return (
                  <View
                    key={`${log.class_date}-${log.subject_name}-${index}`}
                    style={[
                      styles.historyRow,
                      {
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.historyIcon,
                        {
                          backgroundColor: present
                            ? isDark
                              ? '#052E2B'
                              : '#ECFDF5'
                            : late
                              ? isDark
                                ? '#3A2705'
                                : '#FFFBEB'
                              : isDark
                                ? '#3B1111'
                                : '#FEF2F2',
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          present
                            ? 'checkmark'
                            : late
                              ? 'time-outline'
                              : 'close'
                        }
                        size={17}
                        color={
                          present
                            ? colors.success
                            : late
                              ? colors.warning
                              : colors.danger
                        }
                      />
                    </View>

                    <View style={styles.historyBody}>
                      <Text
                        style={[
                          styles.historySubject,
                          { color: colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {log.subject_name}
                      </Text>

                      <Text
                        style={[
                          styles.historyDate,
                          { color: colors.muted },
                        ]}
                      >
                        {formatDate(log.class_date)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: present
                            ? isDark
                              ? '#052E2B'
                              : '#ECFDF5'
                            : late
                              ? isDark
                                ? '#3A2705'
                                : '#FFFBEB'
                              : isDark
                                ? '#3B1111'
                                : '#FEF2F2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: present
                              ? colors.success
                              : late
                                ? colors.warning
                                : colors.danger,
                          },
                        ]}
                      >
                        {log.status}
                      </Text>
                    </View>
                  </View>
                );
              })
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No attendance history"
              message="No attendance history is available for this semester."
              colors={colors}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle: string;
  colors: Colors;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text
        style={[
          styles.sectionHeading,
          { color: colors.text },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.sectionSubtitle,
          { color: colors.muted },
        ]}
      >
        {subtitle}
      </Text>
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
          { backgroundColor: `${color}18` },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.statLabel,
          { color: colors.muted },
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
          { color: colors.subtle },
        ]}
      >
        {caption}
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
            borderColor: colors.border,
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

function AttendanceRing({
  percentage,
  colors,
}: {
  percentage: number;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.ring,
        {
          borderColor:
            percentage >= REQUIRED_PERCENTAGE
              ? colors.success
              : colors.danger,
        },
      ]}
    >
      <Text
        style={[
          styles.ringValue,
          { color: colors.text },
        ]}
      >
        {percentage}%
      </Text>

      <Text
        style={[
          styles.ringLabel,
          { color: colors.muted },
        ]}
      >
        Attendance
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  errorIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 7,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 320,
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  header: {
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
  },
  wardCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
  },
  wardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardHeaderText: {
    flex: 1,
    marginLeft: 11,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  wardName: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
  },
  wardMeta: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },
  changeWardButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 16,
    maxHeight: '72%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalSubtitle: {
    marginTop: 3,
    fontSize: 12,
  },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardOptions: {
    gap: 10,
    paddingBottom: 10,
  },
  wardOption: {
    minHeight: 70,
    borderRadius: 15,
    borderWidth: 1,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wardOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardOptionBody: {
    flex: 1,
    marginLeft: 11,
  },
  wardOptionName: {
    fontSize: 14,
    fontWeight: '800',
  },
  wardOptionMeta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  filterBox: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  semesterScroll: {
    gap: 8,
    paddingTop: 11,
  },
  semesterButton: {
    width: 39,
    height: 37,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semesterButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  subjectFilter: {
    borderRadius: 17,
    borderWidth: 1,
    paddingVertical: 13,
    marginBottom: 12,
  },
  subjectScroll: {
    gap: 8,
    paddingHorizontal: 13,
    paddingTop: 11,
  },
  subjectChip: {
    minHeight: 35,
    maxWidth: 190,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  wardIdentity: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  identityAvatar: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityAvatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  identityBody: {
    flex: 1,
    marginLeft: 11,
  },
  identityLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  identityName: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '900',
  },
  identityMeta: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },
  inlineLoading: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inlineLoadingText: {
    marginLeft: 9,
    fontSize: 12,
    fontWeight: '600',
  },
  overallCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overallLeft: {
    flex: 1,
    paddingRight: 10,
  },
  percentage: {
    fontSize: 38,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -1,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    marginTop: 9,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  ringLabel: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '48.3%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 25,
    fontWeight: '900',
    marginTop: 3,
  },
  statCaption: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    marginBottom: 9,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  listCard: {
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  subjectRow: {
    padding: 13,
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  subjectRowBody: {
    flex: 1,
    paddingRight: 10,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  subjectMeta: {
    fontSize: 10,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 9,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  subjectPercentageBox: {
    width: 54,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subjectPercentage: {
    fontSize: 15,
    fontWeight: '900',
  },
  subjectStatus: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  historyRow: {
    minHeight: 68,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  historyIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
    marginLeft: 10,
  },
  historySubject: {
    fontSize: 12,
    fontWeight: '800',
  },
  historyDate: {
    fontSize: 10,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
    maxWidth: 280,
  },
});