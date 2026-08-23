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
};

type RosterStudent = {
  student_id: number | string;
  roll?: string | number | null;
  name?: string | null;
  status?: 'Present' | 'Absent' | string;
};

type HistoryRecord = {
  id: number | string;
  date?: string;
  class?: string;
  semester?: string | number;
  subject?: string;
  present?: number;
  absent?: number;
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
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
};

const todayISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

export default function TeacherAttendance() {
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
    successSoft: isDark ? '#063B34' : '#ECFDF5',
    danger: '#EF4444',
    dangerSoft: isDark ? '#3B1515' : '#FEF2F2',
    warning: '#F59E0B',
    warningSoft: isDark ? '#3A2A0A' : '#FFFBEB',
  };

  const [teacherId, setTeacherId] = useState<number | string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<
    number | string | ''
  >('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  const [semesterModalOpen, setSemesterModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);

  const [sessionDate, setSessionDate] = useState(todayISO());

  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [view, setView] = useState<'mark' | 'history'>('mark');

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyDetail, setHistoryDetail] = useState<RosterStudent[]>([]);
  const [selectedHistory, setSelectedHistory] =
    useState<HistoryRecord | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [openingSheet, setOpeningSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [historySemester, setHistorySemester] = useState('All');
  const [historySubject, setHistorySubject] = useState('All');

  const loadSubjects = useCallback(async () => {
    try {
      setError('');

      const rawUser = await getItem('authUser');

      if (!rawUser) {
        throw new Error(
          'Your session could not be restored. Please sign in again.'
        );
      }

      const user = JSON.parse(rawUser);

      if (!user?.id) {
        throw new Error('Teacher account information is unavailable.');
      }

      setTeacherId(user.id);

      const response = await api.get(
        `/teacher/${user.id}/assigned-subjects`
      );

      const list = Array.isArray(response.data) ? response.data : [];

      setSubjects(list);

      if (list.length) {
        setSelectedSubjectId((current) =>
          current &&
          list.some(
            (item) => String(item.id) === String(current)
          )
            ? current
            : list[0].id
        );
      }
    } catch (err: any) {
      console.error(
        'TEACHER ATTENDANCE SUBJECTS ERROR:',
        err?.response?.data || err?.message
      );

      setSubjects([]);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load assigned subjects.'
      );
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!teacherId) return;

    try {
      setLoadingHistory(true);

      const response = await api.get(
        `/teacher/${teacherId}/attendance-history`
      );

      setHistory(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err: any) {
      console.error(
        'TEACHER ATTENDANCE HISTORY ERROR:',
        err?.response?.data || err?.message
      );

      Alert.alert(
        'Unable to load history',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Please try again.'
      );

      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [teacherId]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      await loadSubjects();

      setLoading(false);
      setRefreshing(false);
    };

    run();
  }, [loadSubjects]);

  useEffect(() => {
    if (view === 'history') {
      loadHistory();
    }
  }, [view, loadHistory]);

  const semesterOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        subjects
          .map((item) => item.semester)
          .filter(
            (value) =>
              value !== null &&
              value !== undefined &&
              String(value).trim() !== ''
          )
          .map(String)
      )
    );

    return values.sort((a, b) => Number(a) - Number(b));
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    if (!selectedSemester) {
      return subjects;
    }

    return subjects.filter(
      (item) =>
        String(item.semester ?? '') === selectedSemester
    );
  }, [subjects, selectedSemester]);

  const selectedSubject = useMemo(
    () =>
      subjects.find(
        (item) =>
          String(item.id) === String(selectedSubjectId)
      ) || null,
    [subjects, selectedSubjectId]
  );

  useEffect(() => {
    if (!subjects.length) {
      setSelectedSemester('');
      setSelectedSubjectId('');
      return;
    }

    const availableSemesters = semesterOptions;

    const currentSemester =
      selectedSemester &&
      availableSemesters.includes(selectedSemester)
        ? selectedSemester
        : String(subjects[0].semester ?? '');

    if (currentSemester !== selectedSemester) {
      setSelectedSemester(currentSemester);
    }

    const visible = currentSemester
      ? subjects.filter(
          (item) =>
            String(item.semester ?? '') === currentSemester
        )
      : subjects;

    if (
      !visible.some(
        (item) =>
          String(item.id) === String(selectedSubjectId)
      )
    ) {
      setSelectedSubjectId(visible[0]?.id ?? '');
    }
  }, [
    subjects,
    semesterOptions,
    selectedSemester,
    selectedSubjectId,
  ]);

  const stats = useMemo(() => {
    const present = roster.filter(
      (student) => student.status === 'Present'
    ).length;

    const absent = roster.filter(
      (student) => student.status !== 'Present'
    ).length;

    return {
      total: roster.length,
      present,
      absent,
    };
  }, [roster]);

  const historyStats = useMemo(() => {
    const present = history.reduce(
      (sum, item) => sum + Number(item.present || 0),
      0
    );

    const absent = history.reduce(
      (sum, item) => sum + Number(item.absent || 0),
      0
    );

    return {
      records: history.length,
      present,
      absent,
    };
  }, [history]);

  const semesters = useMemo(() => {
    const values = Array.from(
      new Set(
        history
          .map((item) =>
            String(item.semester ?? '')
          )
          .filter(Boolean)
      )
    );

    return ['All', ...values];
  }, [history]);

  const historySubjects = useMemo(() => {
    const values = Array.from(
      new Set(
        history
          .map((item) => item.subject)
          .filter(Boolean) as string[]
      )
    );

    return ['All', ...values];
  }, [history]);

  const filteredHistory = useMemo(
    () =>
      history.filter((item) => {
        const semesterMatch =
          historySemester === 'All' ||
          String(item.semester) === historySemester;

        const subjectMatch =
          historySubject === 'All' ||
          item.subject === historySubject;

        return semesterMatch && subjectMatch;
      }),
    [history, historySemester, historySubject]
  );

  const refresh = async () => {
    setRefreshing(true);

    await loadSubjects();

    if (view === 'history') {
      await loadHistory();
    }

    setRefreshing(false);
  };

  const openSheet = async () => {
    if (!selectedSubjectId) {
      Alert.alert(
        'Select a subject',
        'Choose an assigned subject first.'
      );

      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      Alert.alert(
        'Invalid date',
        'Use the date format YYYY-MM-DD.'
      );

      return;
    }

    try {
      setOpeningSheet(true);

      const response = await api.get(
        `/subjects/${selectedSubjectId}/students`
      );

      const list = Array.isArray(response.data)
        ? response.data
        : [];

      if (!list.length) {
        Alert.alert(
          'No students found',
          "No students are enrolled in this subject's course."
        );

        return;
      }

      setRoster(
        list.map((student: any) => ({
          ...student,
          status: student.status || 'Absent',
        }))
      );

      setSheetOpen(true);
    } catch (err: any) {
      console.error(
        'TEACHER ATTENDANCE ROSTER ERROR:',
        err?.response?.data || err?.message
      );

      Alert.alert(
        'Unable to open attendance sheet',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Could not load students.'
      );
    } finally {
      setOpeningSheet(false);
    }
  };

  const toggleStudent = (
    studentId: number | string
  ) => {
    setRoster((current) =>
      current.map((student) =>
        String(student.student_id) ===
        String(studentId)
          ? {
              ...student,
              status:
                student.status === 'Present'
                  ? 'Absent'
                  : 'Present',
            }
          : student
      )
    );
  };

  const markAll = (
    status: 'Present' | 'Absent'
  ) => {
    setRoster((current) =>
      current.map((student) => ({
        ...student,
        status,
      }))
    );
  };

  const saveAttendance = async () => {
    if (
      !teacherId ||
      !selectedSubjectId ||
      !roster.length
    ) {
      return;
    }

    try {
      setSaving(true);

      await api.post('/attendance', {
        subject_id: selectedSubjectId,
        date: sessionDate,
        students: roster,
        marked_by: teacherId,
      });

      Alert.alert(
        'Attendance saved',
        `Attendance for ${sessionDate} has been saved successfully.`
      );

      setSheetOpen(false);
      setRoster([]);
    } catch (err: any) {
      console.error(
        'TEACHER ATTENDANCE SAVE ERROR:',
        err?.response?.data || err?.message
      );

      Alert.alert(
        'Unable to save attendance',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openHistoryDetail = async (
    record: HistoryRecord
  ) => {
    try {
      const response = await api.get(
        `/attendance/class/${record.id}`
      );

      setHistoryDetail(
        Array.isArray(response.data)
          ? response.data
          : []
      );

      setSelectedHistory(record);
      setDetailOpen(true);
    } catch (err: any) {
      console.error(
        'TEACHER ATTENDANCE DETAIL ERROR:',
        err?.response?.data || err?.message
      );

      Alert.alert(
        'Unable to open record',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Could not load this attendance sheet.'
      );
    }
  };

  const renderStat = (
    label: string,
    value: number,
    icon: any,
    tint: string,
    soft: string
  ) => (
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
          {
            backgroundColor: soft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={tint}
        />
      </View>

      <Text
        style={[
          styles.statLabel,
          {
            color: colors.muted,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.statValue,
          {
            color: tint,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                },
              ]}
            >
              Attendance
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.muted,
                },
              ]}
            >
              Mark and manage attendance for your assigned
              classes.
            </Text>
          </View>

          <Pressable
            onPress={() =>
              setView(
                view === 'mark'
                  ? 'history'
                  : 'mark'
              )
            }
            style={[
              styles.historyButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name={
                view === 'mark'
                  ? 'time-outline'
                  : 'arrow-back-outline'
              }
              size={17}
              color={colors.primary}
            />

            <Text
              style={[
                styles.historyButtonText,
                {
                  color: colors.text,
                },
              ]}
            >
              {view === 'mark'
                ? 'Previous Records'
                : 'Back to Marking'}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text
              style={[
                styles.stateText,
                {
                  color: colors.muted,
                },
              ]}
            >
              Loading attendance...
            </Text>
          </View>
        ) : error ? (
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.stateIcon,
                {
                  backgroundColor:
                    colors.dangerSoft,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={colors.danger}
              />
            </View>

            <Text
              style={[
                styles.stateTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Unable to load attendance
            </Text>

            <Text
              style={[
                styles.stateText,
                {
                  color: colors.muted,
                },
              ]}
            >
              {error}
            </Text>

            <Pressable
              onPress={() => {
                setLoading(true);

                loadSubjects().finally(() =>
                  setLoading(false)
                );
              }}
              style={[
                styles.retryButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Ionicons
                name="refresh-outline"
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : view === 'history' ? (
          <View>
            <View style={styles.statsRow}>
              {renderStat(
                'RECORDS',
                historyStats.records,
                'document-text-outline',
                colors.primary,
                colors.primarySoft
              )}

              {renderStat(
                'PRESENT',
                historyStats.present,
                'checkmark-circle-outline',
                colors.success,
                colors.successSoft
              )}

              {renderStat(
                'ABSENT',
                historyStats.absent,
                'close-circle-outline',
                colors.danger,
                colors.dangerSoft
              )}
            </View>

            <FilterChips
              label="SEMESTER"
              values={semesters}
              selected={historySemester}
              onSelect={setHistorySemester}
              colors={colors}
            />

            <FilterChips
              label="SUBJECT"
              values={historySubjects}
              selected={historySubject}
              onSelect={setHistorySubject}
              colors={colors}
            />

            {loadingHistory ? (
              <View style={styles.centerState}>
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                />

                <Text
                  style={[
                    styles.stateText,
                    {
                      color: colors.muted,
                    },
                  ]}
                >
                  Loading previous records...
                </Text>
              </View>
            ) : filteredHistory.length === 0 ? (
              <EmptyCard
                title="No attendance records"
                message="No previous attendance records match the selected filters."
                colors={colors}
              />
            ) : (
              <View style={styles.listGap}>
                {filteredHistory.map((record) => {
                  const total =
                    Number(record.present || 0) +
                    Number(record.absent || 0);

                  const pct = total
                    ? Math.round(
                        (Number(record.present || 0) /
                          total) *
                          100
                      )
                    : 0;

                  return (
                    <View
                      key={String(record.id)}
                      style={[
                        styles.historyCard,
                        {
                          backgroundColor:
                            colors.card,
                          borderColor:
                            colors.border,
                        },
                      ]}
                    >
                      <View style={styles.historyTop}>
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
                            size={20}
                            color={colors.primary}
                          />
                        </View>

                        <View
                          style={
                            styles.historyTitleWrap
                          }
                        >
                          <Text
                            style={[
                              styles.historySubject,
                              {
                                color:
                                  colors.text,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {record.subject ||
                              'Attendance'}
                          </Text>

                          <Text
                            style={[
                              styles.historyMeta,
                              {
                                color:
                                  colors.muted,
                              },
                            ]}
                          >
                            {record.date || '—'} ·{' '}
                            {record.class || 'Class'} ·
                            Semester{' '}
                            {record.semester ?? '—'}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.percentBadge,
                            {
                              backgroundColor:
                                pct >= 75
                                  ? colors.successSoft
                                  : colors.warningSoft,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.percentText,
                              {
                                color:
                                  pct >= 75
                                    ? colors.success
                                    : colors.warning,
                              },
                            ]}
                          >
                            {pct}%
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.historyDivider,
                          {
                            backgroundColor:
                              colors.border,
                          },
                        ]}
                      />

                      <View
                        style={
                          styles.historyNumbers
                        }
                      >
                        <Metric
                          label="Present"
                          value={Number(
                            record.present || 0
                          )}
                          color={colors.success}
                          colors={colors}
                        />

                        <Metric
                          label="Absent"
                          value={Number(
                            record.absent || 0
                          )}
                          color={colors.danger}
                          colors={colors}
                        />

                        <Metric
                          label="Total"
                          value={total}
                          color={colors.text}
                          colors={colors}
                        />
                      </View>

                      <Pressable
                        onPress={() =>
                          openHistoryDetail(record)
                        }
                        style={[
                          styles.viewSheetButton,
                          {
                            backgroundColor:
                              colors.primarySoft,
                          },
                        ]}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={17}
                          color={colors.primary}
                        />

                        <Text
                          style={[
                            styles.viewSheetText,
                            {
                              color:
                                colors.primary,
                            },
                          ]}
                        >
                          View Attendance Sheet
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.statsRow}>
              {renderStat(
                'STUDENTS',
                stats.total,
                'people-outline',
                colors.primary,
                colors.primarySoft
              )}

              {renderStat(
                'PRESENT',
                stats.present,
                'checkmark-circle-outline',
                colors.success,
                colors.successSoft
              )}

              {renderStat(
                'ABSENT',
                stats.absent,
                'close-circle-outline',
                colors.danger,
                colors.dangerSoft
              )}
            </View>

            <View
              style={[
                styles.selectorCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Field
                label="SESSION DATE"
                value={sessionDate}
                onChangeText={setSessionDate}
                placeholder="YYYY-MM-DD"
                colors={colors}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: colors.muted,
                  },
                ]}
              >
                SEMESTER
              </Text>

              <Pressable
                onPress={() =>
                  setSemesterModalOpen(true)
                }
                disabled={!semesterOptions.length}
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor:
                      colors.soft,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dropdownIcon,
                    {
                      backgroundColor:
                        colors.primarySoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="layers-outline"
                    size={17}
                    color={colors.primary}
                  />
                </View>

                <View
                  style={
                    styles.dropdownTextWrap
                  }
                >
                  <Text
                    style={[
                      styles.dropdownValue,
                      {
                        color: colors.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedSemester
                      ? `Semester ${selectedSemester}`
                      : 'Select semester'}
                  </Text>

                  <Text
                    style={[
                      styles.dropdownHint,
                      {
                        color: colors.muted,
                      },
                    ]}
                  >
                    {filteredSubjects.length}{' '}
                    subject
                    {filteredSubjects.length === 1
                      ? ''
                      : 's'}{' '}
                    available
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: colors.muted,
                    marginTop: 12,
                  },
                ]}
              >
                ASSIGNED SUBJECT
              </Text>

              <Pressable
                onPress={() =>
                  setSubjectModalOpen(true)
                }
                disabled={!filteredSubjects.length}
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor:
                      colors.soft,
                    borderColor:
                      colors.border,
                  },
                  !filteredSubjects.length &&
                    styles.disabled,
                ]}
              >
                <View
                  style={[
                    styles.dropdownIcon,
                    {
                      backgroundColor:
                        colors.primarySoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="book-outline"
                    size={17}
                    color={colors.primary}
                  />
                </View>

                <View
                  style={
                    styles.dropdownTextWrap
                  }
                >
                  <Text
                    style={[
                      styles.dropdownValue,
                      {
                        color: colors.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedSubject?.subject_name ||
                      selectedSubject?.course_name ||
                      'Select subject'}
                  </Text>

                  <Text
                    style={[
                      styles.dropdownHint,
                      {
                        color: colors.muted,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedSubject?.subject_code ||
                      'Choose an assigned subject'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: colors.muted,
                    marginTop: 12,
                  },
                ]}
              >
                {' '}
              </Text>

              <Pressable
                onPress={openSheet}
                disabled={
                  openingSheet ||
                  !filteredSubjects.length ||
                  !selectedSubjectId
                }
                style={[
                  styles.openButton,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                  (openingSheet ||
                    !filteredSubjects.length ||
                    !selectedSubjectId) &&
                    styles.disabled,
                ]}
              >
                {openingSheet ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                )}

                <Text
                  style={styles.openButtonText}
                >
                  {openingSheet
                    ? 'Opening...'
                    : 'Open Attendance Sheet'}
                </Text>
              </Pressable>
            </View>

            {roster.length === 0 ? (
              <EmptyCard
                title="Attendance sheet not open"
                message="Select a date and subject, then open the sheet to mark students present or absent."
                colors={colors}
              />
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Semester Selection Modal */}
      <Modal
        visible={semesterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSemesterModalOpen(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.selectionModal,
              {
                backgroundColor:
                  colors.card,
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View
                style={styles.modalTitleWrap}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Select Semester
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color: colors.muted,
                    },
                  ]}
                >
                  Choose the semester for attendance
                  marking.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setSemesterModalOpen(false)
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.muted}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.selectionList
              }
            >
              {semesterOptions.map((semester) => {
                const active =
                  semester === selectedSemester;

                const count =
                  subjects.filter(
                    (item) =>
                      String(
                        item.semester ?? ''
                      ) === semester
                  ).length;

                return (
                  <Pressable
                    key={semester}
                    onPress={() => {
                      setSelectedSemester(
                        semester
                      );
                      setSemesterModalOpen(
                        false
                      );
                    }}
                    style={[
                      styles.selectionRow,
                      {
                        backgroundColor: active
                          ? colors.primarySoft
                          : colors.soft,
                        borderColor: active
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.selectionIcon,
                        {
                          backgroundColor:
                            active
                              ? colors.primary
                              : colors.card,
                        },
                      ]}
                    >
                      <Ionicons
                        name="layers-outline"
                        size={18}
                        color={
                          active
                            ? '#FFFFFF'
                            : colors.primary
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.selectionTextWrap
                      }
                    >
                      <Text
                        style={[
                          styles.selectionTitle,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        Semester {semester}
                      </Text>

                      <Text
                        style={[
                          styles.selectionSubtitle,
                          {
                            color:
                              colors.muted,
                          },
                        ]}
                      >
                        {count} subject
                        {count === 1 ? '' : 's'}
                      </Text>
                    </View>

                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color={colors.primary}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.subtle}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subject Selection Modal */}
      <Modal
        visible={subjectModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSubjectModalOpen(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.selectionModal,
              {
                backgroundColor:
                  colors.card,
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View
                style={styles.modalTitleWrap}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Select Subject
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color: colors.muted,
                    },
                  ]}
                >
                  Semester{' '}
                  {selectedSemester || '—'} ·{' '}
                  {filteredSubjects.length}{' '}
                  available
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setSubjectModalOpen(false)
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.muted}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.selectionList
              }
            >
              {filteredSubjects.length === 0 ? (
                <EmptyCard
                  title="No subjects found"
                  message="There are no assigned subjects for this semester."
                  colors={colors}
                />
              ) : (
                filteredSubjects.map((subject) => {
                  const active =
                    String(subject.id) ===
                    String(selectedSubjectId);

                  return (
                    <Pressable
                      key={String(subject.id)}
                      onPress={() => {
                        setSelectedSubjectId(
                          subject.id
                        );
                        setSubjectModalOpen(
                          false
                        );
                      }}
                      style={[
                        styles.selectionRow,
                        {
                          backgroundColor: active
                            ? colors.primarySoft
                            : colors.soft,
                          borderColor: active
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.selectionIcon,
                          {
                            backgroundColor:
                              active
                                ? colors.primary
                                : colors.card,
                          },
                        ]}
                      >
                        <Ionicons
                          name="book-outline"
                          size={18}
                          color={
                            active
                              ? '#FFFFFF'
                              : colors.primary
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.selectionTextWrap
                        }
                      >
                        <Text
                          style={[
                            styles.selectionTitle,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {subject.subject_name ||
                            subject.course_name ||
                            'Unnamed Subject'}
                        </Text>

                        <Text
                          style={[
                            styles.selectionSubtitle,
                            {
                              color:
                                colors.muted,
                            },
                          ]}
                        >
                          {subject.subject_code ||
                            'No subject code'}
                        </Text>
                      </View>

                      {active ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={21}
                          color={colors.primary}
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.subtle}
                        />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Attendance Sheet */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() =>
          !saving && setSheetOpen(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor:
                  colors.card,
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View
                style={styles.modalTitleWrap}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Student Roster
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color: colors.muted,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {selectedSubject?.course_name ||
                    selectedSubject?.subject_name ||
                    'Attendance'}{' '}
                  · {sessionDate}
                </Text>
              </View>

              <Pressable
                disabled={saving}
                onPress={() =>
                  setSheetOpen(false)
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.muted}
                />
              </Pressable>
            </View>

            {/* Bulk Actions */}
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() =>
                  markAll('Present')
                }
                style={[
                  styles.bulkButton,
                  {
                    backgroundColor:
                      colors.successSoft,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={colors.success}
                />

                <Text
                  style={[
                    styles.bulkText,
                    {
                      color: colors.success,
                    },
                  ]}
                >
                  All Present
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  markAll('Absent')
                }
                style={[
                  styles.bulkButton,
                  {
                    backgroundColor:
                      colors.dangerSoft,
                  },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color={colors.danger}
                />

                <Text
                  style={[
                    styles.bulkText,
                    {
                      color: colors.danger,
                    },
                  ]}
                >
                  All Absent
                </Text>
              </Pressable>
            </View>

            <View style={styles.sheetSummary}>
              <Text
                style={[
                  styles.sheetSummaryText,
                  {
                    color: colors.muted,
                  },
                ]}
              >
                {stats.present} present ·{' '}
                {stats.absent} absent ·{' '}
                {stats.total} students
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 12,
              }}
            >
              {roster.map((student) => {
                const present =
                  student.status === 'Present';

                return (
                  <View
                    key={String(
                      student.student_id
                    )}
                    style={[
                      styles.studentRow,
                      {
                        backgroundColor:
                          colors.soft,
                        borderColor:
                          colors.border,
                      },
                    ]}
                  >
                    {/* Avatar */}
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor:
                            present
                              ? colors.successSoft
                              : colors.primarySoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          {
                            color: present
                              ? colors.success
                              : colors.primary,
                          },
                        ]}
                      >
                        {String(
                          student.name || '?'
                        )
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>

                    {/* Student Information */}
                    <View
                      style={
                        styles.studentInfo
                      }
                    >
                      <Text
                        style={[
                          styles.studentName,
                          {
                            color: colors.text,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {student.name ||
                          'Unnamed Student'}
                      </Text>

                      <Text
                        style={[
                          styles.studentRoll,
                          {
                            color: colors.muted,
                          },
                        ]}
                      >
                        Roll No.{' '}
                        {student.roll ?? '—'}
                      </Text>
                    </View>

                    {/* Present / Absent Toggle */}
                    <View
                      style={[
                        styles.attendanceToggle,
                        {
                          backgroundColor:
                            colors.card,
                          borderColor:
                            colors.border,
                        },
                      ]}
                    >
                      {/* Present */}
                      <Pressable
                        onPress={() => {
                          if (!present) {
                            toggleStudent(
                              student.student_id
                            );
                          }
                        }}
                        style={[
                          styles.toggleOption,
                          present && {
                            backgroundColor:
                              colors.success,
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={
                            present
                              ? '#FFFFFF'
                              : colors.muted
                          }
                        />

                        <Text
                          style={[
                            styles.toggleOptionText,
                            {
                              color: present
                                ? '#FFFFFF'
                                : colors.muted,
                            },
                          ]}
                        >
                          Present
                        </Text>
                      </Pressable>

                      {/* Absent */}
                      <Pressable
                        onPress={() => {
                          if (present) {
                            toggleStudent(
                              student.student_id
                            );
                          }
                        }}
                        style={[
                          styles.toggleOption,
                          !present && {
                            backgroundColor:
                              colors.danger,
                          },
                        ]}
                      >
                        <Ionicons
                          name="close"
                          size={13}
                          color={
                            !present
                              ? '#FFFFFF'
                              : colors.muted
                          }
                        />

                        <Text
                          style={[
                            styles.toggleOptionText,
                            {
                              color: !present
                                ? '#FFFFFF'
                                : colors.muted,
                            },
                          ]}
                        >
                          Absent
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={saveAttendance}
              disabled={saving}
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    colors.primary,
                },
                saving && styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="save-outline"
                  size={18}
                  color="#FFFFFF"
                />
              )}

              <Text
                style={styles.saveButtonText}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Attendance'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Attendance History Detail */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDetailOpen(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor:
                  colors.card,
              },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View
                style={styles.modalTitleWrap}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Attendance Sheet
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color: colors.muted,
                    },
                  ]}
                >
                  {selectedHistory?.subject ||
                    'Attendance'}{' '}
                  · {selectedHistory?.date ||
                    '—'}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setDetailOpen(false)
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.muted}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 16,
              }}
            >
              {historyDetail.length === 0 ? (
                <EmptyCard
                  title="No student details"
                  message="This attendance record has no student-level data."
                  colors={colors}
                />
              ) : (
                historyDetail.map((student) => {
                  const present =
                    student.status === 'Present';

                  return (
                    <View
                      key={String(
                        student.student_id
                      )}
                      style={[
                        styles.detailRow,
                        {
                          borderColor:
                            colors.border,
                        },
                      ]}
                    >
                      <View
                        style={
                          styles.detailInfo
                        }
                      >
                        <Text
                          style={[
                            styles.studentName,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                        >
                          {student.name ||
                            'Unnamed Student'}
                        </Text>

                        <Text
                          style={[
                            styles.studentRoll,
                            {
                              color:
                                colors.muted,
                            },
                          ]}
                        >
                          Roll No.{' '}
                          {student.roll ?? '—'}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.detailStatus,
                          {
                            color: present
                              ? colors.success
                              : colors.danger,
                          },
                        ]}
                      >
                        {present
                          ? 'Present'
                          : 'Absent'}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterChips({
  label,
  values,
  selected,
  onSelect,
  colors,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  colors: Colors;
}) {
  return (
    <View style={styles.filterWrap}>
      <Text
        style={[
          styles.fieldLabel,
          {
            color: colors.muted,
          },
        ]}
      >
        {label}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {values.map((value) => (
          <Pressable
            key={value}
            onPress={() =>
              onSelect(value)
            }
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  selected === value
                    ? colors.primary
                    : colors.card,
                borderColor:
                  selected === value
                    ? colors.primary
                    : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    selected === value
                      ? '#FFFFFF'
                      : colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Metric({
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
    <View style={styles.metric}>
      <Text
        style={[
          styles.metricValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.metricLabel,
          {
            color: colors.muted,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function EmptyCard({
  title,
  message,
  colors,
}: {
  title: string;
  message: string;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.stateCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.stateIcon,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name="document-text-outline"
          size={28}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.stateTitle,
          {
            color: colors.text,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.stateText,
          {
            color: colors.muted,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: Colors;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text
        style={[
          styles.fieldLabel,
          {
            color: colors.muted,
          },
        ]}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        style={[
          styles.fieldInput,
          {
            backgroundColor:
              colors.soft,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  headerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },

  historyButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  historyButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    minHeight: 116,
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    justifyContent: 'space-between',
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },

  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  statValue: {
    fontSize: 27,
    fontWeight: '900',
  },

  selectorCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },

  fieldWrap: {
    marginBottom: 12,
  },

  fieldLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 7,
  },

  fieldInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
  },

  selectBox: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  dropdownButton: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },

  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dropdownTextWrap: {
    flex: 1,
    paddingRight: 6,
  },

  dropdownValue: {
    fontSize: 12,
    fontWeight: '900',
  },

  dropdownHint: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
  },

  subjectChip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
    marginRight: 7,
  },

  subjectChipText: {
    fontSize: 10,
    fontWeight: '900',
  },

  openButton: {
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  openButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  centerState: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },

  stateCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 4,
  },

  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  stateTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },

  retryButton: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 18,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  filterWrap: {
    marginBottom: 12,
  },

  chipRow: {
    gap: 7,
    paddingRight: 8,
  },

  filterChip: {
    maxWidth: 220,
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    justifyContent: 'center',
  },

  filterChipText: {
    fontSize: 10,
    fontWeight: '900',
  },

  listGap: {
    gap: 12,
  },

  historyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyTitleWrap: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 8,
  },

  historySubject: {
    fontSize: 14,
    fontWeight: '900',
  },

  historyMeta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
  },

  percentBadge: {
    minWidth: 46,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  percentText: {
    fontSize: 11,
    fontWeight: '900',
  },

  historyDivider: {
    height: 1,
    marginVertical: 13,
  },

  historyNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  metric: {
    flex: 1,
  },

  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },

  metricLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '800',
  },

  viewSheetButton: {
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  viewSheetText: {
    fontSize: 12,
    fontWeight: '900',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.58)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },

  selectionModal: {
    maxHeight: '78%',
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },

  selectionList: {
    gap: 9,
    paddingBottom: 4,
  },

  selectionRow: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: 15,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectionTextWrap: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 8,
  },

  selectionTitle: {
    fontSize: 12,
    fontWeight: '900',
  },

  selectionSubtitle: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  modalTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '900',
  },

  modalSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  bulkButton: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },

  bulkText: {
    fontSize: 10,
    fontWeight: '900',
  },

  sheetSummary: {
    paddingVertical: 8,
  },

  sheetSummaryText: {
    fontSize: 10,
    fontWeight: '800',
  },

  studentRow: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 15,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },

  studentInfo: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 5,
  },

  studentName: {
    fontSize: 12,
    fontWeight: '900',
  },

  studentRoll: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
  },

  attendanceToggle: {
    width: 132,
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },

  toggleOption: {
    flex: 1,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
  },

  toggleOptionText: {
    fontSize: 8,
    fontWeight: '900',
  },

  saveButton: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  detailRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },

  detailInfo: {
    flex: 1,
    paddingRight: 10,
  },

  detailStatus: {
    fontSize: 11,
    fontWeight: '900',
  },

  disabled: {
    opacity: 0.55,
  },
});