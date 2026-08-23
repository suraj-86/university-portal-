import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

type ChildProfile = {
  student_id: string | number;
  user_id: string | number;
  full_name: string;
  course_name?: string;
  semester?: string | number;
  roll_no?: string | number;
  roll_number?: string | number;
  enrollment_no?: string | number;
};

type SummaryMetrics = {
  cgpa?: number;
  semester?: number | string;
  attendance?: number;
  total_fee?: number;
  paid_fee?: number;
  outstanding_fee?: number;
};

type ProfileResponse = {
  academic?: {
    current_cgpa?: string | number | null;
    attendance_overall?: string | number | null;
    semester?: string | number | null;
  };
};

type FeeRecord = {
  total_fee?: string | number | null;
  paid_amount?: string | number | null;
};

type ResultSubject = {
  total?: string | number | null;
  totalMax?: string | number | null;
  grade?: string | null;
};

type AttendanceLog = {
  status?: string | null;
  class_date?: string | null;
  subject_name?: string | null;
};

type SemesterResults = Record<string, ResultSubject[]>;

type UpcomingClass = {
  id: string | number;
  subject: string;
  class_date_label?: string;
  time: string;
  faculty: string;
  room: string;
};

type Notice = {
  id: string | number;
  title: string;
  content?: string | null;
  type?: string | null;
  date?: string | null;
  attachment_url?: string | null;
  author_role?: string | null;
  author_name?: string | null;
  priority?: string | null;
};

type DashboardResponse = {
  childProfile: ChildProfile;
  allWards: Ward[];
  summaryMetrics?: SummaryMetrics;
};

type DashboardData = {
  summary: DashboardResponse;
  classes: UpcomingClass[];
  notices: Notice[];
  metrics: SummaryMetrics;
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

export default function ParentDashboard() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [wards, setWards] = useState<Ward[]>([]);
  const [parentName, setParentName] = useState('Parent');
  const [wardPickerOpen, setWardPickerOpen] = useState(false);

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

  const fetchDashboard = useCallback(
    async (showLoader = true) => {
      try {
        setError('');

        if (showLoader) {
          setLoading(true);
        }

        const rawUser = await getItem('authUser');

        if (!rawUser) {
          throw new Error(
            'Your session could not be restored. Please sign in again.'
          );
        }

        const user = JSON.parse(rawUser);

        if (!user?.id) {
          throw new Error('Parent account information is unavailable.');
        }

        const resolvedParentName =
          user?.full_name ||
          user?.name ||
          user?.parent_name ||
          user?.username ||
          'Parent';

        setParentName(String(resolvedParentName));

        const overviewUrl = selectedWardId
          ? `/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
          : `/parent/${user.id}/wards-overview`;

        const overviewResponse = await api.get(overviewUrl);

        const overview: DashboardResponse = overviewResponse.data;

        if (!overview?.childProfile) {
          setData(null);
          setWards(overview?.allWards || []);
          setError('No active students are linked to your parent account.');
          return;
        }

        const availableWards = overview.allWards || [];

        setWards(availableWards);

        if (!selectedWardId && overview.childProfile.student_id) {
          setSelectedWardId(String(overview.childProfile.student_id));
        }

        const childUserId = overview.childProfile.user_id;

        // Load every dashboard metric from the same endpoints used by the
        // dedicated Parent screens. wards-overview does not reliably expose
        // summaryMetrics in the current backend, so it must NOT be the source
        // of CGPA / attendance / fee values.
        let upcomingClasses: UpcomingClass[] = [];
        let notices: Notice[] = [];
        let metrics: SummaryMetrics = {};

        const semester = Number(overview.childProfile.semester) || 1;

        const [dashboardResult, profileResult, feesResult, resultsResult, attendanceResult, noticesResult] =
          await Promise.allSettled([
            api.get(`/student/${childUserId}/custom-dashboard`),
            api.get(`/student/${childUserId}/profile`),
            api.get(`/student/${childUserId}/fees`),
            api.get(`/student/${childUserId}/results`),
            api.get(`/student/${childUserId}/attendance-logs?semester=${semester}`),
            api.get(`/student/${childUserId}/notices`),
          ]);

        // 1. Upcoming classes + dashboard notices.
        if (dashboardResult.status === 'fulfilled') {
          const dashboard = dashboardResult.value?.data || {};

          if (Array.isArray(dashboard.upcoming_classes)) {
            upcomingClasses = dashboard.upcoming_classes;
          }

          if (Array.isArray(dashboard.notices)) {
            notices = dashboard.notices;
          }
        } else {
          console.warn(
            'PARENT DASHBOARD CUSTOM FEED ERROR:',
            dashboardResult.reason
          );
        }

        // 2. Profile is a fallback source for CGPA/attendance only.
        if (profileResult.status === 'fulfilled') {
          const profile: ProfileResponse = profileResult.value?.data || {};
          const academic = profile.academic || {};

          const profileCgpa = parseNumeric(academic.current_cgpa);
          const profileAttendance = parseNumeric(academic.attendance_overall);

          if (profileCgpa !== null) metrics.cgpa = profileCgpa;
          if (profileAttendance !== null) metrics.attendance = profileAttendance;
        } else {
          console.warn('PARENT DASHBOARD PROFILE ERROR:', profileResult.reason);
        }

        // 3. Fees: exactly the same calculation as Parent Fees.
        if (feesResult.status === 'fulfilled') {
          const fees: FeeRecord[] = Array.isArray(feesResult.value?.data)
            ? feesResult.value.data
            : [];

          const totalFee = fees.reduce(
            (sum, fee) => sum + Number(fee.total_fee || 0),
            0
          );
          const paidFee = fees.reduce(
            (sum, fee) => sum + Number(fee.paid_amount || 0),
            0
          );

          metrics.total_fee = totalFee;
          metrics.paid_fee = paidFee;
          metrics.outstanding_fee = Math.max(totalFee - paidFee, 0);
        } else {
          console.warn('PARENT DASHBOARD FEES ERROR:', feesResult.reason);
        }

        // 4. Results: use the exact cumulative-CGPA algorithm from Parent Results.
        if (resultsResult.status === 'fulfilled') {
          const rawResults = resultsResult.value?.data;
          const results: SemesterResults =
            rawResults && typeof rawResults === 'object' && !Array.isArray(rawResults)
              ? rawResults
              : {};

          let percentageSum = 0;
          let semesterCount = 0;

          Object.values(results).forEach((subjects) => {
            const published = Array.isArray(subjects)
              ? subjects.filter(
                  (subject) =>
                    subject.total !== null &&
                    subject.total !== undefined &&
                    subject.total !== '' &&
                    Number.isFinite(Number(subject.total))
                )
              : [];

            if (published.length === 0) return;

            const earned = published.reduce(
              (sum, subject) => sum + Number(subject.total || 0),
              0
            );
            const maximum = published.reduce(
              (sum, subject) => sum + (Number(subject.totalMax) || 100),
              0
            );

            if (maximum > 0) {
              percentageSum += (earned / maximum) * 100;
              semesterCount += 1;
            }
          });

          if (semesterCount > 0) {
            metrics.cgpa = Number(
              ((percentageSum / semesterCount) / 9.5).toFixed(2)
            );
          }
        } else {
          console.warn('PARENT DASHBOARD RESULTS ERROR:', resultsResult.reason);
        }

        // 5. Attendance: calculate from the same attendance logs used by
        // Parent Attendance. Present + Late count as attended.
        if (attendanceResult.status === 'fulfilled') {
          const logs: AttendanceLog[] = Array.isArray(attendanceResult.value?.data)
            ? attendanceResult.value.data
            : [];

          const present = logs.filter(
            (log) => String(log.status || '').toLowerCase() === 'present'
          ).length;
          const late = logs.filter(
            (log) => String(log.status || '').toLowerCase() === 'late'
          ).length;

          if (logs.length > 0) {
            metrics.attendance = Number(
              (((present + late) / logs.length) * 100).toFixed(1)
            );
          }
        } else {
          console.warn(
            'PARENT DASHBOARD ATTENDANCE ERROR:',
            attendanceResult.reason
          );
        }

        // 6. If custom-dashboard did not contain notices, use the same
        // notices endpoint as the dedicated Parent Notices page.
        if (notices.length === 0 && noticesResult.status === 'fulfilled') {
          if (Array.isArray(noticesResult.value?.data)) {
            notices = noticesResult.value.data;
          }
        }

        setData({
          summary: overview,
          classes: upcomingClasses,
          notices,
          metrics,
        });
      } catch (err: any) {
        console.error(
          'PARENT DASHBOARD ERROR:',
          err?.response?.data || err?.message || err
        );

        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Unable to load the parent dashboard.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedWardId]
  );

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard(false);
  };

  const handleWardChange = (wardId: string) => {
    if (wardId === selectedWardId) return;

    setSelectedWardId(wardId);
    setData(null);
  };

  if (loading && !data) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />

        <Text
          style={[
            styles.loadingText,
            { color: colors.muted },
          ]}
        >
          Loading parent dashboard...
        </Text>
      </View>
    );
  }

  if (error && !data) {
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
          Dashboard unavailable
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
          onPress={() => fetchDashboard()}
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

  if (!data?.summary?.childProfile) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <Ionicons
          name="people-outline"
          size={40}
          color={colors.subtle}
        />

        <Text
          style={[
            styles.errorTitle,
            { color: colors.text },
          ]}
        >
          No Ward Linked
        </Text>

        <Text
          style={[
            styles.errorText,
            { color: colors.muted },
          ]}
        >
          No active students are currently linked to your parent
          account.
        </Text>
      </View>
    );
  }

  const { childProfile } = data.summary;
  const summaryMetrics = data.metrics || {};

  const selectedWard = wards.find(
    (ward) =>
      String(ward.student_id) === String(selectedWardId)
  );

  const rollNumber =
    childProfile.roll_no ??
    childProfile.roll_number ??
    childProfile.enrollment_no ??
    selectedWard?.roll_no ??
    selectedWard?.roll_number ??
    selectedWard?.enrollment_no ??
    null;

  const attendance =
    typeof summaryMetrics?.attendance === 'number'
      ? summaryMetrics.attendance
      : null;

  const cgpa =
    typeof summaryMetrics?.cgpa === 'number'
      ? summaryMetrics.cgpa
      : null;

  const outstanding =
    typeof summaryMetrics?.outstanding_fee === 'number'
      ? summaryMetrics.outstanding_fee
      : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>

          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            Welcome, {parentName} 
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.muted },
            ]}
          >
            Monitor your ward's academic progress and
            campus activity.
          </Text>
        </View>

        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="people"
            size={21}
            color="#FFFFFF"
          />
        </View>
      </View>

      {/* WARD SELECTOR */}
      {wards.length > 0 && (
        <>
          <SectionHeading
            title="Select Ward"
            subtitle="CHOOSE STUDENT"
            colors={colors}
          />

          <Pressable
            onPress={() => setWardPickerOpen(true)}
            style={[
              styles.wardDropdown,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.wardDropdownIcon,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <View style={styles.wardDropdownBody}>
              <Text
                style={[
                  styles.wardDropdownLabel,
                  { color: colors.subtle },
                ]}
              >
                SELECT WARD
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.wardDropdownName,
                  { color: colors.text },
                ]}
              >
                {selectedWard?.full_name || childProfile.full_name}
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.wardDropdownMeta,
                  { color: colors.muted },
                ]}
              >
                {selectedWard?.course_name ||
                  childProfile.course_name ||
                  'Student'}
                {rollNumber !== null
                  ? ` • Roll No. ${rollNumber}`
                  : ''}
              </Text>
            </View>

            <Ionicons
              name="chevron-down"
              size={20}
              color={colors.subtle}
            />
          </Pressable>

          <Modal
            visible={wardPickerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setWardPickerOpen(false)}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setWardPickerOpen(false)}
            >
              <Pressable
                style={[
                  styles.wardModal,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={(event) => event.stopPropagation()}
              >
                <View style={styles.wardModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.wardModalTitle,
                        { color: colors.text },
                      ]}
                    >
                      Select Ward
                    </Text>
                    <Text
                      style={[
                        styles.wardModalSubtitle,
                        { color: colors.muted },
                      ]}
                    >
                      Choose the student you want to view
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setWardPickerOpen(false)}
                    style={[
                      styles.modalCloseButton,
                      { backgroundColor: colors.primarySoft },
                    ]}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={colors.primary}
                    />
                  </Pressable>
                </View>

                <View style={styles.wardOptions}>
                  {wards.map((ward) => {
                    const active =
                      String(ward.student_id) ===
                      String(selectedWardId);

                    const wardRoll =
                      ward.roll_no ??
                      ward.roll_number ??
                      ward.enrollment_no ??
                      null;

                    return (
                      <Pressable
                        key={ward.student_id}
                        onPress={() => {
                          handleWardChange(String(ward.student_id));
                          setWardPickerOpen(false);
                        }}
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
                            name="person"
                            size={17}
                            color={active ? '#FFFFFF' : colors.primary}
                          />
                        </View>

                        <View style={styles.wardOptionBody}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.wardOptionName,
                              { color: colors.text },
                            ]}
                          >
                            {ward.full_name}
                          </Text>

                          <Text
                            numberOfLines={1}
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

                        {active ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={21}
                            color={colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}

      {/* WARD PROFILE */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.profileBanner,
            { backgroundColor: colors.primary },
          ]}
        />

        <View style={styles.profileBody}>
          <View
            style={[
              styles.profileAvatar,
              {
                backgroundColor: colors.card,
                borderColor: colors.card,
              },
            ]}
          >
            <Text
              style={[
                styles.profileAvatarText,
                { color: colors.primary },
              ]}
            >
              {childProfile.full_name
                ?.charAt(0)
                ?.toUpperCase() || 'S'}
            </Text>
          </View>

          <Text
            style={[
              styles.profileName,
              { color: colors.text },
            ]}
          >
            {childProfile.full_name}
          </Text>

          <Text
            style={[
              styles.profileCourse,
              { color: colors.primary },
            ]}
          >
            {childProfile.course_name || 'Student'}
            {childProfile.semester
              ? ` • Sem ${childProfile.semester}`
              : ''}
          </Text>

          {rollNumber !== null ? (
            <Text
              style={[
                styles.profileEmail,
                { color: colors.muted },
              ]}
            >
              Roll No. {rollNumber}
            </Text>
          ) : null}

          <View
            style={[
              styles.studentIdRow,
              { borderTopColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.studentIdLabel,
                { color: colors.subtle },
              ]}
            >
              ROLL NUMBER
            </Text>

            <Text
              style={[
                styles.studentIdValue,
                { color: colors.text },
              ]}
            >
              {rollNumber !== null ? rollNumber : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* QUICK STATS */}
      <SectionHeading
        title="Academic Overview"
        subtitle="CURRENT PERFORMANCE"
        colors={colors}
      />

      <View style={styles.statsGrid}>
        <StatCard
          icon="school-outline"
          label="SEMESTER"
          value={
            childProfile.semester
              ? String(childProfile.semester)
              : '—'
          }
          colors={colors}
        />

        <StatCard
          icon="trophy-outline"
          label="CGPA"
          value={
            cgpa !== null
              ? cgpa.toFixed(2)
              : 'N/A'
          }
          colors={colors}
        />

        <StatCard
          icon="checkmark-circle-outline"
          label="ATTENDANCE"
          value={
            attendance !== null
              ? `${attendance.toFixed(1)}%`
              : 'N/A'
          }
          colors={colors}
          valueColor={
            attendance !== null
              ? attendance >= 75
                ? colors.success
                : colors.danger
              : colors.muted
          }
        />

        <StatCard
          icon="wallet-outline"
          label="OUTSTANDING"
          value={
            outstanding !== null
              ? formatCurrency(outstanding)
              : 'N/A'
          }
          colors={colors}
          valueColor={
            outstanding !== null &&
            outstanding > 0
              ? colors.danger
              : colors.success
          }
        />
      </View>

      {/* QUICK ACTIONS */}
      <SectionHeading
        title="Quick Access"
        subtitle="WARD INFORMATION"
        colors={colors}
      />

      <View style={styles.actionGrid}>
        <ActionCard
          icon="calendar-outline"
          label="Attendance"
          colors={colors}
          onPress={() => router.push('/parent/attendance')}
        />

        <ActionCard
          icon="school-outline"
          label="Results"
          colors={colors}
          onPress={() => router.push('/parent/results')}
        />

        <ActionCard
          icon="wallet-outline"
          label="Fees"
          colors={colors}
          onPress={() => router.push('/parent/fees')}
        />

        <ActionCard
          icon="notifications-outline"
          label="Notices"
          colors={colors}
          onPress={() => router.push('/parent/notices')}
        />
      </View>

      {/* UPCOMING CLASSES */}
      <SectionHeading
        title="Upcoming Classes"
        subtitle="NEXT SCHEDULED SESSIONS"
        colors={colors}
        rightLabel={`${data.classes.length} ${
          data.classes.length === 1
            ? 'SESSION'
            : 'SESSIONS'
        }`}
      />

      <View style={styles.stack}>
        {data.classes.length > 0 ? (
          data.classes.slice(0, 5).map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.classCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.classIcon,
                  {
                    backgroundColor:
                      index === 0
                        ? colors.primary
                        : colors.primarySoft,
                    borderColor:
                      index === 0
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={21}
                  color={
                    index === 0
                      ? '#FFFFFF'
                      : colors.primary
                  }
                />
              </View>

              <View style={styles.classInfo}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.subject,
                    { color: colors.text },
                  ]}
                >
                  {item.subject}
                </Text>

                <Text
                  style={[
                    styles.classMeta,
                    { color: colors.subtle },
                  ]}
                >
                  {item.class_date_label
                    ? `${item.class_date_label} • `
                    : ''}
                  {item.time}
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.faculty,
                    { color: colors.muted },
                  ]}
                >
                  {item.faculty}
                </Text>
              </View>

              <View
                style={[
                  styles.roomBadge,
                  {
                    backgroundColor:
                      colors.cardSoft,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={colors.primary}
                />

                <Text
                  numberOfLines={1}
                  style={[
                    styles.roomText,
                    { color: colors.text },
                  ]}
                >
                  {item.room}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming classes"
            colors={colors}
          />
        )}
      </View>

      {/* CAMPUS BOARD */}
      <SectionHeading
        title="Campus Board"
        subtitle="RECENT NOTICES"
        colors={colors}
        rightLabel={
          data.notices.length > 0
            ? String(data.notices.length)
            : undefined
        }
      />

      <View style={styles.stack}>
        {data.notices.length > 0 ? (
          data.notices.slice(0, 5).map((notice) => (
            <Pressable
              key={notice.id}
              onPress={() => router.push('/parent/notices')}
              style={[
                styles.noticeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.noticeIcon,
                  {
                    backgroundColor:
                      notice.type === 'Alert'
                        ? isDark
                          ? '#451A03'
                          : '#FFF7ED'
                        : colors.primarySoft,
                  },
                ]}
              >
                <Ionicons
                  name={
                    notice.type === 'Academic'
                      ? 'calendar-outline'
                      : notice.type === 'Alert'
                        ? 'warning-outline'
                        : 'notifications-outline'
                  }
                  size={20}
                  color={
                    notice.type === 'Alert'
                      ? colors.warning
                      : colors.primary
                  }
                />
              </View>

              <View style={styles.noticeBody}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.noticeTitle,
                    { color: colors.text },
                  ]}
                >
                  {notice.title}
                </Text>

                <View style={styles.noticeMeta}>
                  <Text
                    style={[
                      styles.noticeType,
                      { color: colors.primary },
                    ]}
                  >
                    {notice.type || 'General'}
                  </Text>

                  <Text
                    style={[
                      styles.noticeSeparator,
                      { color: colors.subtle },
                    ]}
                  >
                    •
                  </Text>

                  <Text
                    style={[
                      styles.noticeDate,
                      { color: colors.subtle },
                    ]}
                  >
                    {notice.date}
                  </Text>

                  {notice.attachment_url ? (
                    <Ionicons
                      name="attach-outline"
                      size={14}
                      color={colors.subtle}
                      style={{ marginLeft: 4 }}
                    />
                  ) : null}
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.subtle}
              />
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="notifications-off-outline"
            title="No recent notices"
            colors={colors}
          />
        )}
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  title,
  subtitle,
  rightLabel,
  colors,
}: {
  title: string;
  subtitle: string;
  rightLabel?: string;
  colors: Colors;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={{ flex: 1 }}>
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

      {rightLabel ? (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor:
                colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.countBadgeText,
              { color: colors.primary },
            ]}
          >
            {rightLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  colors,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: Colors;
  valueColor?: string;
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
          size={18}
          color={colors.primary}
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
        numberOfLines={1}
        style={[
          styles.statValue,
          {
            color:
              valueColor || colors.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionCard({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: Colors;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: colors.primarySoft },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.actionLabel,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.subtle}
      />
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: colors.cardSoft,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={colors.subtle}
      />

      <Text
        style={[
          styles.emptyText,
          { color: colors.muted },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value).replace('%', '').replace(/,/g, '').trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
  },

  errorIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },

  errorText: {
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
    marginBottom: 22,
  },

  retryButton: {
    minWidth: 130,
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
    paddingRight: 14,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },

  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  wardDropdown: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },

  wardDropdownIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  wardDropdownBody: {
    flex: 1,
    minWidth: 0,
  },

  wardDropdownLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },

  wardDropdownName: {
    fontSize: 14,
    fontWeight: '900',
  },

  wardDropdownMeta: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 12,
  },

  wardModal: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    maxHeight: '75%',
  },

  wardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  wardModalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },

  wardModalSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  wardOptions: {
    gap: 10,
  },

  wardOption: {
    minHeight: 70,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  wardOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  wardOptionBody: {
    flex: 1,
    minWidth: 0,
  },

  wardOptionName: {
    fontSize: 13,
    fontWeight: '900',
  },

  wardOptionMeta: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 26,
  },

  profileBanner: {
    height: 76,
  },

  profileBody: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -35,
    marginBottom: 12,
    elevation: 3,
  },

  profileAvatarText: {
    fontSize: 27,
    fontWeight: '900',
  },

  profileName: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  profileCourse: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 5,
    textAlign: 'center',
  },

  profileEmail: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    marginBottom: 18,
  },

  studentIdRow: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  studentIdLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  studentIdValue: {
    fontSize: 12,
    fontWeight: '800',
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  sectionSubtitle: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 4,
  },

  countBadge: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 10,
  },

  countBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },

  statCard: {
    width: '48%',
    minHeight: 128,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },

  actionGrid: {
    gap: 10,
    marginBottom: 26,
  },

  actionCard: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  actionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },

  stack: {
    gap: 10,
    marginBottom: 26,
  },

  classCard: {
    minHeight: 94,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  classIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  classInfo: {
    flex: 1,
    minWidth: 0,
  },

  subject: {
    fontSize: 14,
    fontWeight: '900',
    flexShrink: 1,
    marginBottom: 5,
  },

  classMeta: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  faculty: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },

  roomBadge: {
    maxWidth: 82,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },

  roomText: {
    fontSize: 9,
    fontWeight: '800',
    flexShrink: 1,
  },

  noticeCard: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  noticeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  noticeBody: {
    flex: 1,
    minWidth: 0,
  },

  noticeTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },

  noticeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  noticeType: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  noticeSeparator: {
    fontSize: 10,
    marginHorizontal: 6,
  },

  noticeDate: {
    fontSize: 9,
    fontWeight: '700',
  },

  emptyState: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  emptyText: {
    fontSize: 12,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 30,
  },
});