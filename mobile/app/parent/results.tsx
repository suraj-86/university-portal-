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

type ResultSubject = {
  id?: string | number;
  subject: string;
  semester?: string | number;
  credits?: number | string | null;
  midTerm?: number | string | null;
  midTermMax?: number | string | null;
  final?: number | string | null;
  finalMax?: number | string | null;
  assignment?: number | string | null;
  sessional1?: number | string | null;
  sessional2?: number | string | null;
  endSem?: number | string | null;
  total?: number | string | null;
  totalMax?: number | string | null;
  grade?: string | null;
};

type SemesterResults = Record<string, ResultSubject[]>;

type SubjectListItem = {
  subject_name?: string | null;
  subject?: string | null;
  name?: string | null;
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

export default function ParentResults() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [wardPickerOpen, setWardPickerOpen] = useState(false);

  const [resultsData, setResultsData] = useState<SemesterResults>({});
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [semesterSubjects, setSemesterSubjects] = useState<ResultSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('All');

  const [loadingWard, setLoadingWard] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
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
        throw new Error('Your session could not be restored. Please sign in again.');
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
      const availableWards: Ward[] = Array.isArray(data.allWards) ? data.allWards : [];

      setWards(availableWards);

      if (!data.childProfile) {
        setSelectedWard(null);
        setSelectedSemester(null);
        setResultsData({});
        setSemesterSubjects([]);
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
        'PARENT RESULTS WARD ERROR:',
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

  const loadResults = useCallback(async () => {
    if (!selectedWard?.user_id || selectedSemester === null) return;

    try {
      setError('');
      setLoadingResults(true);

      const childUserId = selectedWard.user_id;
      const params = `?semester=${selectedSemester}`;

      const [resultsRequest, subjectsRequest] = await Promise.allSettled([
        api.get(`/student/${childUserId}/results`),
        api.get(`/student/${childUserId}/subjects-list${params}`),
      ]);

      if (resultsRequest.status === 'rejected') {
        throw resultsRequest.reason;
      }

      const rawResults = resultsRequest.value?.data;
      const data: SemesterResults =
        rawResults && typeof rawResults === 'object' && !Array.isArray(rawResults)
          ? rawResults
          : {};

      setResultsData(data);

      const resultSubjects: ResultSubject[] = Array.isArray(data[String(selectedSemester)])
        ? data[String(selectedSemester)]
        : [];

      let catalogSubjects: ResultSubject[] = [];

      if (subjectsRequest.status === 'fulfilled' && Array.isArray(subjectsRequest.value?.data)) {
        catalogSubjects = subjectsRequest.value.data
          .map((item: SubjectListItem) => {
            const subjectName = item?.subject_name || item?.subject || item?.name || '';
            return String(subjectName).trim();
          })
          .filter(Boolean)
          .map((subjectName) => ({ subject: subjectName }));
      }

      const mergedSubjects = mergeSubjectsWithResults(catalogSubjects, resultSubjects);
      setSemesterSubjects(
        mergedSubjects.length > 0 ? mergedSubjects : resultSubjects
      );
    } catch (err: any) {
      console.error(
        'PARENT RESULTS ERROR:',
        err?.response?.data || err?.message || err
      );

      setResultsData({});
      setSemesterSubjects([]);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to load your ward's academic results."
      );
    } finally {
      setLoadingResults(false);
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
      setSelectedSubject('All');
      loadResults();
    }
  }, [selectedWard?.user_id, selectedSemester, loadResults]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWard();
    if (selectedWard?.user_id && selectedSemester !== null) {
      loadResults();
    }
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
    setResultsData({});
    setSemesterSubjects([]);
    setError('');
    setWardPickerOpen(false);
  };

  const semesters = useMemo(() => {
    const apiSemesters = Object.keys(resultsData)
      .map(Number)
      .filter((sem) => Number.isInteger(sem) && sem > 0)
      .sort((a, b) => a - b);

    return Array.from(
      new Set([
        ...Array.from({ length: 8 }, (_, i) => i + 1),
        ...apiSemesters,
      ])
    ).sort((a, b) => a - b);
  }, [resultsData]);

  const selectedSubjects = useMemo(
    () =>
      selectedSubject === 'All'
        ? semesterSubjects
        : semesterSubjects.filter((subject) => subject.subject === selectedSubject),
    [semesterSubjects, selectedSubject]
  );

  const selectedSubjectsWithMarks = useMemo(
    () => selectedSubjects.filter(hasPublishedTotal),
    [selectedSubjects]
  );

  const totalScore = useMemo(
    () => selectedSubjectsWithMarks.reduce((sum, subject) => sum + toNumber(subject.total), 0),
    [selectedSubjectsWithMarks]
  );

  const totalMaximum = useMemo(
    () =>
      selectedSubjectsWithMarks.reduce(
        (sum, subject) => sum + (toNumber(subject.totalMax) || 100),
        0
      ),
    [selectedSubjectsWithMarks]
  );

  const percentage = useMemo(() => {
    if (selectedSubjectsWithMarks.length === 0 || totalMaximum <= 0) return null;
    return Math.round((totalScore / totalMaximum) * 1000) / 10;
  }, [selectedSubjectsWithMarks.length, totalMaximum, totalScore]);

  const cumulativeCgpa = useMemo(() => {
    const entries = Object.values(resultsData);
    if (entries.length === 0) return 0;

    let percentageSum = 0;
    let semesterCount = 0;

    entries.forEach((subjects) => {
      const published = subjects.filter(hasPublishedTotal);
      if (published.length === 0) return;

      const earned = published.reduce((sum, subject) => sum + toNumber(subject.total), 0);
      const maximum = published.reduce(
        (sum, subject) => sum + (toNumber(subject.totalMax) || 100),
        0
      );

      if (maximum > 0) {
        percentageSum += (earned / maximum) * 100;
        semesterCount += 1;
      }
    });

    if (semesterCount === 0) return 0;
    return Number(((percentageSum / semesterCount) / 9.5).toFixed(2));
  }, [resultsData]);

  const gradedSubjects = selectedSubjects.filter(
    (subject) => hasPublishedTotal(subject) && String(subject.grade || '').trim() !== ''
  );

  const passedSubjects = gradedSubjects.filter(
    (subject) => String(subject.grade).toUpperCase() !== 'F'
  ).length;

  const isPassed =
    gradedSubjects.length > 0 &&
    gradedSubjects.every((subject) => String(subject.grade).toUpperCase() !== 'F');

  const historyEntries = useMemo(() => {
    return Object.keys(resultsData)
      .map(Number)
      .filter((semester) => Number.isInteger(semester))
      .sort((a, b) => a - b)
      .map((semester) => {
        const subjects = (resultsData[String(semester)] || []).filter(hasPublishedTotal);
        if (subjects.length === 0) return null;

        const earned = subjects.reduce((sum, subject) => sum + toNumber(subject.total), 0);
        const maximum = subjects.reduce(
          (sum, subject) => sum + (toNumber(subject.totalMax) || 100),
          0
        );
        const percentage = maximum > 0 ? (earned / maximum) * 100 : 0;
        const graded = subjects.filter((subject) => String(subject.grade || '').trim() !== '');
        const passed = graded.length > 0 && graded.every(
          (subject) => String(subject.grade).toUpperCase() !== 'F'
        );

        return {
          semester,
          subjects,
          earned,
          maximum,
          percentage,
          passed,
          hasGrades: graded.length > 0,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [resultsData]);

  if (loadingWard || selectedSemester === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading ward results...</Text>
      </View>
    );
  }

  if (error && !selectedWard) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
          <Ionicons name="school-outline" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Results unavailable</Text>
        <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
        <Pressable onPress={loadWard} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
              style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="arrow-back" size={21} color={colors.text} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>Academic Results</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Track your ward's academic performance</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => setWardPickerOpen(true)}
          style={[styles.wardSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.wardIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="people-outline" size={19} color={colors.primary} />
          </View>
          <View style={styles.wardSelectorInfo}>
            <Text style={[styles.eyebrow, { color: colors.subtle }]}>SELECT WARD</Text>
            <Text numberOfLines={1} style={[styles.wardName, { color: colors.text }]}>
              {selectedWard?.full_name || 'Select student'}
            </Text>
            <Text numberOfLines={1} style={[styles.wardMeta, { color: colors.muted }]}>
              {selectedWard?.course_name || 'Student'}
              {rollNumber(selectedWard) ? ` • Roll No. ${rollNumber(selectedWard)}` : ''}
            </Text>
          </View>
          <View style={[styles.selectorChevron, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
            <Ionicons name="chevron-down" size={18} color={colors.text} />
          </View>
        </Pressable>

        {error ? (
          <View style={[styles.inlineError, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={[styles.inlineErrorText, { color: colors.muted }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.filters}>
          <View style={[styles.filterBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.filterLabel, { color: colors.muted }]}>Semester</Text>
            <View style={styles.semesterButtons}>
              {semesters.map((semester) => (
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
                        selectedSemester === semester ? colors.primary : colors.cardSoft,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.semesterButtonText,
                      { color: selectedSemester === semester ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {semester}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.subjectFilter, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.filterHeader}>
            <Ionicons name="book-outline" size={18} color={colors.primary} />
            <Text style={[styles.filterTitle, { color: colors.text }]}>Subject</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectScroll}>
            <Pressable
              onPress={() => setSelectedSubject('All')}
              style={[
                styles.subjectChip,
                {
                  backgroundColor: selectedSubject === 'All' ? colors.primary : colors.cardSoft,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.subjectChipText, { color: selectedSubject === 'All' ? '#FFFFFF' : colors.text }]}>All Subjects</Text>
            </Pressable>

            {semesterSubjects.map((subject) => (
              <Pressable
                key={subject.subject}
                onPress={() => setSelectedSubject(subject.subject)}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor:
                      selectedSubject === subject.subject ? colors.primary : colors.cardSoft,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text numberOfLines={1} style={[styles.subjectChipText, { color: selectedSubject === subject.subject ? '#FFFFFF' : colors.text }]}>
                  {subject.subject}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loadingResults ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingCardText, { color: colors.muted }]}>Updating academic results...</Text>
          </View>
        ) : null}

        <View style={[styles.performanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.performanceLeft}>
            <Text style={[styles.eyebrow, { color: colors.subtle }]}>
              {selectedSubject === 'All' ? 'SEMESTER PERFORMANCE' : 'SUBJECT PERFORMANCE'}
            </Text>
            <Text
              style={[
                styles.percentage,
                { color: (percentage ?? 0) >= 40 ? colors.success : colors.danger },
              ]}
            >
              {percentage === null ? '—' : `${percentage.toFixed(1)}%`}
            </Text>
            <Text style={[styles.scoreText, { color: colors.muted }]}>
              {selectedSubjectsWithMarks.length > 0
                ? `${formatNumber(totalScore)} / ${formatNumber(totalMaximum)} marks`
                : 'Marks not published yet'}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    selectedSubjects.length === 0
                      ? isDark ? '#172033' : '#F1F5F9'
                      : selectedSubjectsWithMarks.length === 0
                        ? isDark ? '#172033' : '#F1F5F9'
                        : gradedSubjects.length === 0
                          ? colors.primarySoft
                          : isPassed
                            ? isDark ? '#052E2B' : '#ECFDF5'
                            : isDark ? '#35101A' : '#FEF2F2',
                },
              ]}
            >
              <Ionicons
                name={
                  selectedSubjects.length === 0
                    ? 'document-outline'
                    : selectedSubjectsWithMarks.length === 0
                      ? 'time-outline'
                      : gradedSubjects.length === 0
                        ? 'document-text-outline'
                        : isPassed
                          ? 'checkmark-circle'
                          : 'warning-outline'
                }
                size={14}
                color={
                  selectedSubjects.length === 0
                    ? colors.muted
                    : selectedSubjectsWithMarks.length === 0
                      ? colors.muted
                      : gradedSubjects.length === 0
                        ? colors.primary
                        : isPassed
                          ? colors.success
                          : colors.danger
                }
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      selectedSubjects.length === 0
                        ? colors.muted
                        : selectedSubjectsWithMarks.length === 0
                          ? colors.muted
                          : gradedSubjects.length === 0
                            ? colors.primary
                            : isPassed
                              ? colors.success
                              : colors.danger,
                  },
                ]}
              >
                {selectedSubjects.length === 0
                  ? 'No subjects available'
                  : selectedSubjectsWithMarks.length === 0
                    ? 'Marks not published yet'
                    : gradedSubjects.length === 0
                      ? 'Marks published'
                      : isPassed
                        ? 'Academic performance is good'
                        : 'Improvement required'}
              </Text>
            </View>
          </View>

          <PerformanceRing percentage={percentage ?? 0} colors={colors} hasResultData={selectedSubjectsWithMarks.length > 0} />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="trophy-outline"
            label="Cumulative CGPA"
            value={cumulativeCgpa.toFixed(2)}
            caption="Overall performance"
            color={colors.primary}
            colors={colors}
          />
          <StatCard
            icon="school-outline"
            label="Subjects"
            value={selectedSubjects.length}
            caption={selectedSubject === 'All' ? 'Subjects in semester' : 'Subject selected'}
            color={colors.primary}
            colors={colors}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Passed"
            value={passedSubjects}
            caption="Subjects passed"
            color={colors.success}
            colors={colors}
          />
          <StatCard
            icon="bar-chart-outline"
            label="Total Marks"
            value={selectedSubjectsWithMarks.length > 0 ? formatNumber(totalScore) : '—'}
            caption={selectedSubjectsWithMarks.length > 0 ? `Out of ${formatNumber(totalMaximum)}` : 'No marks published'}
            color={colors.warning}
            colors={colors}
          />
        </View>

        <SectionHeader
          title={selectedSubject === 'All' ? 'Subject Scorecard' : selectedSubject}
          subtitle={`SEMESTER ${selectedSemester}`}
          colors={colors}
        />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {selectedSubjects.map((subject, index) => (
            <View key={`${subject.subject}-${index}`}>
              <SubjectResult subject={subject} colors={colors} isDark={isDark} />
              {index < selectedSubjects.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
          ))}

          {selectedSubjects.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No subjects found"
              message={`No subjects are available for Semester ${selectedSemester}.`}
              colors={colors}
            />
          ) : null}
        </View>

        <SectionHeader
          title="Semester History"
          subtitle="ACADEMIC PERFORMANCE OVERVIEW"
          colors={colors}
        />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {historyEntries.map((entry, index) => (
            <View key={entry.semester}>
              <Pressable
                onPress={() => {
                  setSelectedSemester(entry.semester);
                  setSelectedSubject('All');
                }}
                style={styles.historyRow}
              >
                <View style={[styles.historyIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="school-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyTitle, { color: colors.text }]}>Semester {entry.semester}</Text>
                  <Text style={[styles.historySubtitle, { color: colors.muted }]}>
                    {entry.subjects.length} subjects • {formatNumber(entry.earned)}/{formatNumber(entry.maximum)} marks
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyPercentage, { color: entry.percentage >= 40 ? colors.success : colors.danger }]}>
                    {entry.percentage.toFixed(1)}%
                  </Text>
                  <Text style={[styles.historyStatus, { color: !entry.hasGrades ? colors.primary : entry.passed ? colors.success : colors.danger }]}>
                    {!entry.hasGrades ? 'Marks published' : entry.passed ? 'Passed' : 'Review'}
                  </Text>
                </View>
              </Pressable>
              {index < historyEntries.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
          ))}

          {historyEntries.length === 0 ? (
            <EmptyState
              icon="school-outline"
              title="No academic history"
              message="No semester results have been published yet."
              colors={colors}
            />
          ) : null}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <Modal
        visible={wardPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setWardPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setWardPickerOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Ward</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Choose the student you want to view</Text>
              </View>
              <Pressable
                onPress={() => setWardPickerOpen(false)}
                style={[styles.modalClose, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wardOptions}>
              {wards.map((ward) => {
                const active = String(ward.student_id) === String(selectedWardId);
                const wardRoll = rollNumber(ward);

                return (
                  <Pressable
                    key={String(ward.student_id)}
                    onPress={() => handleWardChange(String(ward.student_id))}
                    style={[
                      styles.wardOption,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.cardSoft,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.wardOptionIcon, { backgroundColor: active ? colors.primary : colors.card }]}>
                      <Ionicons name="person-outline" size={19} color={active ? '#FFFFFF' : colors.primary} />
                    </View>
                    <View style={styles.wardOptionBody}>
                      <Text style={[styles.wardOptionName, { color: colors.text }]}>{ward.full_name}</Text>
                      <Text style={[styles.wardOptionMeta, { color: colors.muted }]}>
                        {ward.course_name || 'Student'}
                        {wardRoll ? ` • Roll No. ${wardRoll}` : ''}
                      </Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}

              {wards.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="No wards found"
                  message="No active students are linked to this parent account."
                  colors={colors}
                />
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function mergeSubjectsWithResults(
  catalogSubjects: ResultSubject[],
  resultSubjects: ResultSubject[]
): ResultSubject[] {
  const resultMap = new Map<string, ResultSubject>();

  resultSubjects.forEach((result) => {
    const key = normalizeSubjectName(result.subject);
    if (key) resultMap.set(key, result);
  });

  const merged: ResultSubject[] = [];

  catalogSubjects.forEach((catalogSubject) => {
    const key = normalizeSubjectName(catalogSubject.subject);
    if (!key) return;

    const result = resultMap.get(key);
    merged.push(
      result
        ? { ...catalogSubject, ...result, subject: result.subject || catalogSubject.subject }
        : catalogSubject
    );
    resultMap.delete(key);
  });

  resultMap.forEach((result) => merged.push(result));
  return merged;
}

function normalizeSubjectName(value: any): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasPublishedTotal(subject: ResultSubject): boolean {
  return (
    subject.total !== null &&
    subject.total !== undefined &&
    subject.total !== '' &&
    Number.isFinite(Number(subject.total))
  );
}

function toNumber(value: any): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function PerformanceRing({
  percentage,
  colors,
  hasResultData,
}: {
  percentage: number;
  colors: Colors;
  hasResultData: boolean;
}) {
  const passed = hasResultData && percentage >= 40;

  return (
    <View
      style={[
        styles.ring,
        {
          borderColor: !hasResultData
            ? colors.border
            : passed
              ? colors.success
              : colors.danger,
        },
      ]}
    >
      <View style={[styles.ringInner, { backgroundColor: colors.cardSoft }]}>
        <Ionicons
          name={!hasResultData ? 'time-outline' : passed ? 'checkmark-circle-outline' : 'warning-outline'}
          size={28}
          color={!hasResultData ? colors.muted : passed ? colors.success : colors.danger}
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
  value: number | string;
  caption: string;
  color: string;
  colors: Colors;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text style={[styles.statLabel, { color: colors.subtle }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statCaption, { color: colors.muted }]}>{caption}</Text>
    </View>
  );
}

function SubjectResult({
  subject,
  colors,
  isDark,
}: {
  subject: ResultSubject;
  colors: Colors;
  isDark: boolean;
}) {
  const hasTotal = hasPublishedTotal(subject);
  const total = toNumber(subject.total);
  const maximum = toNumber(subject.totalMax) || 100;
  const percentage = hasTotal && maximum > 0 ? (total / maximum) * 100 : 0;
  const grade = String(subject.grade || '').trim() || 'N/A';
  const failed = grade.toUpperCase() === 'F';
  const hasAnyResult =
    hasTotal ||
    subject.midTerm !== null && subject.midTerm !== undefined ||
    subject.final !== null && subject.final !== undefined ||
    subject.assignment !== null && subject.assignment !== undefined ||
    subject.sessional1 !== null && subject.sessional1 !== undefined ||
    subject.sessional2 !== null && subject.sessional2 !== undefined ||
    subject.endSem !== null && subject.endSem !== undefined ||
    String(subject.grade || '').trim() !== '';

  const gradeColor = !hasAnyResult
    ? colors.muted
    : failed
      ? colors.danger
      : percentage >= 75
        ? colors.success
        : colors.primary;

  const gradeBackground = !hasAnyResult
    ? isDark ? '#172033' : '#F1F5F9'
    : failed
      ? isDark ? '#35101A' : '#FEF2F2'
      : percentage >= 75
        ? isDark ? '#052E2B' : '#ECFDF5'
        : colors.primarySoft;

  return (
    <View>
      <View style={styles.subjectRow}>
        <View style={[styles.subjectIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="book-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.subjectInfo}>
          <Text numberOfLines={2} style={[styles.subjectName, { color: colors.text }]}>{subject.subject}</Text>
          <Text style={[styles.subjectDetail, { color: colors.muted }]}>
            Total: {hasTotal ? formatNumber(total) : '-'}/{formatNumber(maximum)}
            {subject.credits !== null && subject.credits !== undefined ? ` • ${subject.credits} credits` : ''}
          </Text>
        </View>
        <View style={styles.subjectGrade}>
          <Text style={[styles.subjectPercentage, { color: gradeColor }]}>
            {hasTotal ? `${percentage.toFixed(1)}%` : '—'}
          </Text>
          <View style={[styles.gradeBadge, { backgroundColor: gradeBackground }]}>
            <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
          </View>
        </View>
      </View>

      <View style={styles.marksGrid}>
        <MarkItem label="Mid-Term" value={subject.midTerm} max={subject.midTermMax} colors={colors} />
        <MarkItem label="Final Exam" value={subject.final} max={subject.finalMax} colors={colors} />
        <MarkItem label="Total" value={subject.total} max={subject.totalMax} colors={colors} />
      </View>
    </View>
  );
}

function MarkItem({
  label,
  value,
  max,
  colors,
}: {
  label: string;
  value?: number | string | null;
  max?: number | string | null;
  colors: Colors;
}) {
  const hasValue = value !== null && value !== undefined && value !== '';
  const hasMax = max !== null && max !== undefined && max !== '';

  return (
    <View style={[styles.markItem, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
      <Text style={[styles.markValue, { color: colors.text }]}>
        {hasValue ? formatNumber(toNumber(value)) : '-'}
        {hasMax ? `/${formatNumber(toNumber(max))}` : ''}
      </Text>
      <Text style={[styles.markLabel, { color: colors.muted }]}>{label}</Text>
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
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.subtle }]}>{subtitle}</Text>
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
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={25} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  errorIcon: { width: 64, height: 64, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  errorTitle: { fontSize: 20, fontWeight: '900' },
  errorText: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  retryButton: { marginTop: 22, height: 46, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerText: { flex: 1 },
  backButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 11, marginTop: 3 },
  wardSelector: { minHeight: 72, borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  wardIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  wardSelectorInfo: { flex: 1, marginLeft: 11, paddingRight: 8 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  wardName: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  wardMeta: { fontSize: 9, marginTop: 3 },
  selectorChevron: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inlineError: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inlineErrorText: { flex: 1, fontSize: 11, lineHeight: 16 },
  filters: { marginBottom: 12 },
  filterBox: { borderWidth: 1, borderRadius: 18, padding: 14 },
  filterLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 7, marginBottom: 9 },
  semesterButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  semesterButton: { minWidth: 38, height: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  semesterButtonText: { fontSize: 12, fontWeight: '800' },
  subjectFilter: { borderWidth: 1, borderRadius: 18, paddingVertical: 14, marginBottom: 12 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 11, gap: 8 },
  filterTitle: { fontSize: 13, fontWeight: '800' },
  subjectScroll: { paddingHorizontal: 14, gap: 8 },
  subjectChip: { maxWidth: 210, minHeight: 38, paddingHorizontal: 13, borderRadius: 11, borderWidth: 1, justifyContent: 'center' },
  subjectChipText: { fontSize: 11, fontWeight: '800' },
  loadingCard: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  loadingCardText: { fontSize: 11, fontWeight: '700' },
  performanceCard: { minHeight: 190, borderWidth: 1, borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  performanceLeft: { flex: 1, paddingRight: 10 },
  percentage: { fontSize: 43, fontWeight: '900', marginTop: 4 },
  scoreText: { fontSize: 11, fontWeight: '600' },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, marginTop: 12 },
  statusText: { fontSize: 9, fontWeight: '800' },
  ring: { width: 105, height: 105, borderRadius: 53, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 145, borderWidth: 1, borderRadius: 18, padding: 14 },
  statIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  statValue: { fontSize: 28, fontWeight: '900', marginTop: 2 },
  statCaption: { fontSize: 10, marginTop: 2 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginTop: 3 },
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginBottom: 26 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 15, paddingBottom: 10 },
  subjectIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  subjectInfo: { flex: 1, marginLeft: 11, paddingRight: 8 },
  subjectName: { fontSize: 13, fontWeight: '900', lineHeight: 18 },
  subjectDetail: { fontSize: 10, marginTop: 3 },
  subjectGrade: { alignItems: 'flex-end' },
  subjectPercentage: { fontSize: 17, fontWeight: '900' },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, marginTop: 3 },
  gradeText: { fontSize: 9, fontWeight: '900' },
  marksGrid: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingBottom: 15 },
  markItem: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 6 },
  markValue: { fontSize: 12, fontWeight: '900' },
  markLabel: { fontSize: 7, fontWeight: '700', marginTop: 2 },
  divider: { height: 1, marginLeft: 65 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 15 },
  historyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  historyInfo: { flex: 1, marginLeft: 11, paddingRight: 7 },
  historyTitle: { fontSize: 13, fontWeight: '900' },
  historySubtitle: { fontSize: 10, marginTop: 3 },
  historyRight: { alignItems: 'flex-end' },
  historyPercentage: { fontSize: 16, fontWeight: '900' },
  historyStatus: { fontSize: 8, fontWeight: '800', marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 40 },
  emptyIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '900' },
  emptyMessage: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  bottomSpace: { height: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2, 6, 23, 0.48)' },
  modalSheet: { maxHeight: '82%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 30 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  modalHeaderText: { flex: 1, paddingRight: 10 },
  modalTitle: { fontSize: 19, fontWeight: '900' },
  modalSubtitle: { fontSize: 11, marginTop: 3 },
  modalClose: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wardOptions: { gap: 9, paddingBottom: 12 },
  wardOption: { minHeight: 68, borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center' },
  wardOptionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  wardOptionBody: { flex: 1, marginLeft: 11, paddingRight: 8 },
  wardOptionName: { fontSize: 13, fontWeight: '900' },
  wardOptionMeta: { fontSize: 9, marginTop: 3 },
});