import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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

type ResultSubject = {
  subject: string;
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

export default function StudentResults() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [resultsData, setResultsData] =
    useState<SemesterResults>({});

  const [selectedSemester, setSelectedSemester] =
    useState<number | null>(null);

  const [semesterSubjects, setSemesterSubjects] =
    useState<ResultSubject[]>([]);

  const [selectedSubject, setSelectedSubject] =
    useState('All');

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
        throw new Error(
          'Student account information is unavailable.'
        );
      }

      const response = await api.get(
        `/student/${userId}/profile`
      );

      const semesterText =
        response.data?.academic?.semester || '';

      const currentSemester = Number(
        String(semesterText).replace(/[^0-9]/g, '')
      );

      setSelectedSemester(
        Number.isInteger(currentSemester) &&
          currentSemester > 0
          ? currentSemester
          : 1
      );
    } catch (err: any) {
      console.error(
        'STUDENT RESULTS SEMESTER ERROR:',
        err?.response?.data || err?.message
      );

      setSelectedSemester(1);
    }
  }, []);

  const loadResults = useCallback(async () => {
    if (selectedSemester === null) return;

    try {
      setError('');

      const rawUser = await getItem('authUser');

      if (!rawUser) {
        throw new Error(
          'Your session could not be restored. Please sign in again.'
        );
      }

      const user = JSON.parse(rawUser);
      const userId = user?.id;

      if (!userId) {
        throw new Error(
          'Student account information is unavailable.'
        );
      }

      const params = `?semester=${selectedSemester}`;

      const [resultsRequest, subjectsRequest] =
        await Promise.allSettled([
          api.get(`/student/${userId}/results`),
          api.get(
            `/student/${userId}/subjects-list${params}`
          ),
        ]);

      if (resultsRequest.status === 'rejected') {
        throw resultsRequest.reason;
      }

      const rawResults = resultsRequest.value?.data;

      const data: SemesterResults =
        rawResults &&
        typeof rawResults === 'object' &&
        !Array.isArray(rawResults)
          ? rawResults
          : {};

      setResultsData(data);

      const resultSubjects: ResultSubject[] =
        Array.isArray(
          data[String(selectedSemester)]
        )
          ? data[String(selectedSemester)]
          : [];

      let catalogSubjects: ResultSubject[] = [];

      if (subjectsRequest.status === 'fulfilled') {
        const rawSubjects =
          subjectsRequest.value?.data;

        if (Array.isArray(rawSubjects)) {
          catalogSubjects = rawSubjects
            .map((item: SubjectListItem) => {
              const subjectName =
                item?.subject_name ||
                item?.subject ||
                item?.name ||
                '';

              return String(subjectName).trim();
            })
            .filter(Boolean)
            .map((subjectName) => ({
              subject: subjectName,
            }));
        }
      } else {
        console.warn(
          'STUDENT RESULTS SUBJECT LIST ERROR:',
          subjectsRequest.reason?.response?.data ||
            subjectsRequest.reason?.message
        );
      }

      const mergedSubjects =
        mergeSubjectsWithResults(
          catalogSubjects,
          resultSubjects
        );

      setSemesterSubjects(mergedSubjects);

      if (
        mergedSubjects.length === 0 &&
        resultSubjects.length > 0
      ) {
        setSemesterSubjects(resultSubjects);
      }

    } catch (err: any) {
      console.error(
        'STUDENT RESULTS ERROR:',
        err?.response?.data || err?.message
      );

      setResultsData({});
      setSemesterSubjects([]);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load your academic results.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSemester]);

  useEffect(() => {
    loadSemester();
  }, [loadSemester]);

  useEffect(() => {
    if (selectedSemester !== null) {
      setSelectedSubject('All');
      setLoading(true);
      loadResults();
    }
  }, [selectedSemester, loadResults]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadResults();
  };

  const semesters = useMemo(() => {
    const apiSemesters = Object.keys(resultsData)
      .map(Number)
      .filter((sem) => Number.isInteger(sem))
      .sort((a, b) => a - b);

    return Array.from(
      new Set([
        ...Array.from(
          { length: 8 },
          (_, i) => i + 1
        ),
        ...apiSemesters,
      ])
    ).sort((a, b) => a - b);
  }, [resultsData]);

  const currentSubjects = semesterSubjects;

  const selectedSubjects = useMemo(
    () =>
      selectedSubject === 'All'
        ? currentSubjects
        : currentSubjects.filter(
            (subject) => subject.subject === selectedSubject
          ),
    [currentSubjects, selectedSubject]
  );

  const selectedSubjectsWithMarks = useMemo(
    () => selectedSubjects.filter(hasPublishedTotal),
    [selectedSubjects]
  );

  const totalScore = useMemo(() => {
    return selectedSubjectsWithMarks.reduce(
      (sum, subject) => sum + toNumber(subject.total),
      0
    );
  }, [selectedSubjectsWithMarks]);

  const totalMaximum = useMemo(() => {
    return selectedSubjectsWithMarks.reduce(
      (sum, subject) =>
        sum + (toNumber(subject.totalMax) || 100),
      0
    );
  }, [selectedSubjectsWithMarks]);

  const hasSelectedResultData =
    selectedSubjectsWithMarks.length > 0;

  const percentage = useMemo(() => {
    if (!hasSelectedResultData || totalMaximum <= 0) {
      return null;
    }

    return (
      Math.round((totalScore / totalMaximum) * 1000) / 10
    );
  }, [
    hasSelectedResultData,
    totalScore,
    totalMaximum,
  ]);

  const cumulativeCgpa = useMemo(() => {
    const available = Object.keys(resultsData);

    if (available.length === 0) return 0;

    let percentageSum = 0;
    let semesterCount = 0;

    available.forEach((semester) => {
      const subjects = (resultsData[semester] || []).filter(
        hasPublishedTotal
      );

      if (subjects.length === 0) return;

      const earned = subjects.reduce(
        (sum, subject) => sum + toNumber(subject.total),
        0
      );

      const maximum = subjects.reduce(
        (sum, subject) =>
          sum + (toNumber(subject.totalMax) || 100),
        0
      );

      if (maximum > 0) {
        percentageSum += (earned / maximum) * 100;
        semesterCount++;
      }
    });

    if (semesterCount === 0) return 0;

    const averagePercentage = percentageSum / semesterCount;

    return Number((averagePercentage / 9.5).toFixed(2));
  }, [resultsData]);

  const gradedSelectedSubjects = selectedSubjects.filter(
    (subject) =>
      hasPublishedTotal(subject) &&
      subject.grade &&
      String(subject.grade).trim() !== ''
  );

  const passedSubjects = gradedSelectedSubjects.filter(
    (subject) =>
      String(subject.grade).toUpperCase() !== 'F'
  ).length;

  const displayedSubjects = selectedSubjects;

  const isPassed =
    gradedSelectedSubjects.length > 0 &&
    gradedSelectedSubjects.every(
      (subject) =>
        String(subject.grade).toUpperCase() !== 'F'
    );

  const hasSelectedGradeData =
    gradedSelectedSubjects.length > 0;

  const historyEntries = useMemo(() => {
    return Object.keys(resultsData)
      .map(Number)
      .filter(Number.isInteger)
      .sort((a, b) => a - b)
      .map((semester) => {
        const subjects = (resultsData[String(semester)] || [])
          .filter(hasPublishedTotal);

        if (subjects.length === 0) return null;

        const earned = subjects.reduce(
          (sum, subject) => sum + toNumber(subject.total),
          0
        );

        const maximum = subjects.reduce(
          (sum, subject) =>
            sum + (toNumber(subject.totalMax) || 100),
          0
        );

        const percentage =
          maximum > 0 ? (earned / maximum) * 100 : 0;

        const graded = subjects.filter(
          (subject) =>
            subject.grade && String(subject.grade).trim() !== ''
        );

        const passed =
          graded.length > 0 &&
          graded.every(
            (subject) =>
              String(subject.grade).toUpperCase() !== 'F'
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
      .filter(
        (entry): entry is NonNullable<typeof entry> =>
          entry !== null
      );
  }, [resultsData]);

  if (loading || selectedSemester === null) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
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
          Loading academic results...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.errorIcon,
            {
              backgroundColor:
                colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="school-outline"
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
          Results unavailable
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
          onPress={loadResults}
          style={[
            styles.retryButton,
            {
              backgroundColor:
                colors.primary,
            },
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
        {
          backgroundColor:
            colors.background,
        },
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
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.backButton,
                {
                  backgroundColor:
                    colors.card,
                  borderColor:
                    colors.border,
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
                Results
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  { color: colors.muted },
                ]}
              >
                Track your academic performance
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.filters}>
          <View
            style={[
              styles.filterBox,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
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

            <View
              style={styles.semesterButtons}
            >
              {semesters.map((semester) => (
                <Pressable
                  key={semester}
                  onPress={() => {
                    setSelectedSemester(
                      semester
                    );
                    setSelectedSubject(
                      'All'
                    );
                  }}
                  style={[
                    styles.semesterButton,
                    {
                      backgroundColor:
                        selectedSemester ===
                        semester
                          ? colors.primary
                          : colors.cardSoft,
                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.semesterButtonText,
                      {
                        color:
                          selectedSemester ===
                          semester
                            ? '#FFFFFF'
                            : colors.text,
                      },
                    ]}
                  >
                    {semester}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.subjectFilter,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
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
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.subjectScroll
            }
          >
            <Pressable
              onPress={() =>
                setSelectedSubject(
                  'All'
                )
              }
              style={[
                styles.subjectChip,
                {
                  backgroundColor:
                    selectedSubject === 'All'
                      ? colors.primary
                      : colors.cardSoft,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  {
                    color:
                      selectedSubject ===
                      'All'
                        ? '#FFFFFF'
                        : colors.text,
                  },
                ]}
              >
                All Subjects
              </Text>
            </Pressable>

            {currentSubjects.map(
              (subject) => (
                <Pressable
                  key={subject.subject}
                  onPress={() =>
                    setSelectedSubject(
                      subject.subject
                    )
                  }
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor:
                        selectedSubject ===
                        subject.subject
                          ? colors.primary
                          : colors.cardSoft,
                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.subjectChipText,
                      {
                        color:
                          selectedSubject ===
                          subject.subject
                            ? '#FFFFFF'
                            : colors.text,
                      },
                    ]}
                  >
                    {subject.subject}
                  </Text>
                </Pressable>
              )
            )}
          </ScrollView>
        </View>

        <View
          style={[
            styles.performanceCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={styles.performanceLeft}
          >
            <Text
              style={[
                styles.eyebrow,
                { color: colors.subtle },
              ]}
            >
              {selectedSubject === 'All'
                ? 'SEMESTER PERFORMANCE'
                : 'SUBJECT PERFORMANCE'}
            </Text>

            <Text
              style={[
                styles.percentage,
                {
                  color:
                    (percentage ?? 0) >= 40
                      ? colors.success
                      : colors.danger,
                },
              ]}
            >
              {percentage === null
                ? '—'
                : `${percentage.toFixed(1)}%`}
            </Text>

            <Text
              style={[
                styles.scoreText,
                { color: colors.muted },
              ]}
            >
              {hasSelectedResultData
                ? `${totalScore} / ${totalMaximum} marks`
                : 'Marks not published yet'}
            </Text>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    !hasSelectedResultData
                      ? isDark
                        ? '#172033'
                        : '#F1F5F9'
                      : isPassed
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
                  !hasSelectedResultData
                    ? 'time-outline'
                    : !hasSelectedGradeData
                      ? 'document-text-outline'
                      : isPassed
                        ? 'checkmark-circle'
                        : 'warning-outline'
                }
                size={14}
                color={
                  !hasSelectedResultData
                    ? colors.muted
                    : !hasSelectedGradeData
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
                      !hasSelectedResultData
                        ? colors.muted
                        : !hasSelectedGradeData
                          ? colors.primary
                          : isPassed
                            ? colors.success
                            : colors.danger,
                  },
                ]}
              >
                {selectedSubjects.length === 0
                  ? 'No subjects available'
                  : !hasSelectedResultData
                    ? 'Marks not published yet'
                    : !hasSelectedGradeData
                      ? 'Marks published'
                      : isPassed
                        ? 'Academic performance is good'
                        : 'Improvement required'}
              </Text>
            </View>
          </View>

          <PerformanceRing
            percentage={percentage ?? 0}
            colors={colors}
            hasResultData={hasSelectedResultData}
          />
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
            caption={
              selectedSubject === 'All'
                ? 'Subjects in semester'
                : 'Subject selected'
            }
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
            value={
              hasSelectedResultData
                ? totalScore
                : '—'
            }
            caption={
              hasSelectedResultData
                ? `Out of ${totalMaximum}`
                : 'No marks published'
            }
            color={colors.warning}
            colors={colors}
          />
        </View>

        <SectionHeader
          title={
            selectedSubject === 'All'
              ? 'Subject-wise Results'
              : selectedSubject
          }
          subtitle={`SEMESTER ${selectedSemester}`}
          colors={colors}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          {displayedSubjects.map(
            (subject, index) => (
              <View key={subject.subject}>
                <SubjectResult
                  subject={subject}
                  colors={colors}
                  isDark={isDark}
                />

                {index <
                  displayedSubjects.length -
                    1 && (
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
            )
          )}

          {displayedSubjects.length ===
            0 && (
            <EmptyState
              icon="document-text-outline"
              title="No subjects found"
              message={`No subjects are available for Semester ${selectedSemester}.`}
              colors={colors}
            />
          )}
        </View>

        <SectionHeader
          title="Semester History"
          subtitle="ACADEMIC PERFORMANCE OVERVIEW"
          colors={colors}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          {historyEntries.map(
            (entry, index) => (
              <View key={entry.semester}>
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
                      name="school-outline"
                      size={19}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.historyInfo}>
                    <Text
                      style={[
                        styles.historyTitle,
                        { color: colors.text },
                      ]}
                    >
                      Semester {entry.semester}
                    </Text>

                    <Text
                      style={[
                        styles.historySubtitle,
                        { color: colors.muted },
                      ]}
                    >
                      {entry.subjects.length} subjects • {entry.earned}/
                      {entry.maximum} marks
                    </Text>
                  </View>

                  <View style={styles.historyRight}>
                    <Text
                      style={[
                        styles.historyPercentage,
                        {
                          color:
                            entry.percentage >= 40
                              ? colors.success
                              : colors.danger,
                        },
                      ]}
                    >
                      {entry.percentage.toFixed(1)}%
                    </Text>

                    <Text
                      style={[
                        styles.historyStatus,
                        {
                          color: !entry.hasGrades
                            ? colors.primary
                            : entry.passed
                              ? colors.success
                              : colors.danger,
                        },
                      ]}
                    >
                      {!entry.hasGrades
                        ? 'Marks published'
                        : entry.passed
                          ? 'Passed'
                          : 'Review'}
                    </Text>
                  </View>
                </View>

                {index < historyEntries.length - 1 && (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>
            )
          )}

          {historyEntries.length === 0 && (
            <EmptyState
              icon="school-outline"
              title="No academic history"
              message="No semester results have been published yet."
              colors={colors}
            />
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

function mergeSubjectsWithResults(
  catalogSubjects: ResultSubject[],
  resultSubjects: ResultSubject[]
): ResultSubject[] {
  const resultMap = new Map<
    string,
    ResultSubject
  >();

  resultSubjects.forEach((result) => {
    const key = normalizeSubjectName(
      result.subject
    );

    if (key) {
      resultMap.set(key, result);
    }
  });

  const merged: ResultSubject[] = [];

  catalogSubjects.forEach(
    (catalogSubject) => {
      const key = normalizeSubjectName(
        catalogSubject.subject
      );

      if (!key) return;

      const result = resultMap.get(key);

      merged.push(
        result
          ? {
              ...catalogSubject,
              ...result,
              subject:
                result.subject ||
                catalogSubject.subject,
            }
          : catalogSubject
      );

      resultMap.delete(key);
    }
  );

  resultMap.forEach((result) => {
    merged.push(result);
  });

  return merged;
}

function normalizeSubjectName(
  value: any
): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function hasResultData(subject: ResultSubject): boolean {
  return (
    subject.assignment !== null &&
    subject.assignment !== undefined &&
    subject.assignment !== ''
  ) || (
    subject.sessional1 !== null &&
    subject.sessional1 !== undefined &&
    subject.sessional1 !== ''
  ) || (
    subject.sessional2 !== null &&
    subject.sessional2 !== undefined &&
    subject.sessional2 !== ''
  ) || (
    subject.endSem !== null &&
    subject.endSem !== undefined &&
    subject.endSem !== ''
  ) || (
    subject.total !== null &&
    subject.total !== undefined &&
    subject.total !== ''
  ) || (
    subject.grade !== null &&
    subject.grade !== undefined &&
    String(subject.grade).trim() !== ''
  );
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

  return Number.isFinite(number)
    ? number
    : 0;
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
  const passed =
    hasResultData && percentage >= 40;

  return (
    <View
      style={[
        styles.ring,
        {
          borderColor:
            !hasResultData
              ? colors.border
              : passed
                ? colors.success
                : colors.danger,
        },
      ]}
    >
      <View
        style={[
          styles.ringInner,
          {
            backgroundColor:
              colors.cardSoft,
          },
        ]}
      >
        <Ionicons
          name={
            !hasResultData
              ? 'time-outline'
              : passed
                ? 'checkmark-circle-outline'
                : 'warning-outline'
          }
          size={28}
          color={
            !hasResultData
              ? colors.muted
              : passed
                ? colors.success
                : colors.danger
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
  value: number | string;
  caption: string;
  color: string;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor:
            colors.card,
          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor:
              colors.primarySoft,
          },
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

function SubjectResult({
  subject,
  colors,
  isDark,
}: {
  subject: ResultSubject;
  colors: Colors;
  isDark: boolean;
}) {
  const hasTotal =
    subject.total !== null &&
    subject.total !== undefined &&
    subject.total !== '';

  const total = toNumber(subject.total);

  const maximum =
    toNumber(subject.totalMax) || 100;

  const percentage =
    hasTotal && maximum > 0
      ? (total / maximum) * 100
      : 0;

  const grade =
    subject.grade &&
    String(subject.grade).trim()
      ? String(subject.grade)
      : 'N/A';

  const failed =
    grade.toUpperCase() === 'F';

  const hasResultData =
    subject.assignment !== null &&
    subject.assignment !== undefined &&
    subject.assignment !== '' ||
    subject.sessional1 !== null &&
    subject.sessional1 !== undefined &&
    subject.sessional1 !== '' ||
    subject.sessional2 !== null &&
    subject.sessional2 !== undefined &&
    subject.sessional2 !== '' ||
    subject.endSem !== null &&
    subject.endSem !== undefined &&
    subject.endSem !== '' ||
    subject.total !== null &&
    subject.total !== undefined &&
    subject.total !== '' ||
    subject.grade !== null &&
    subject.grade !== undefined &&
    String(subject.grade).trim() !== '';

  const gradeColor =
    !hasResultData
      ? colors.muted
      : failed
        ? colors.danger
        : percentage >= 75
          ? colors.success
          : colors.primary;

  const gradeBackground =
    !hasResultData
      ? isDark
        ? '#172033'
        : '#F1F5F9'
      : failed
        ? isDark
          ? '#35101A'
          : '#FEF2F2'
        : percentage >= 75
          ? isDark
            ? '#052E2B'
            : '#ECFDF5'
          : colors.primarySoft;

  return (
    <View>
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
            size={19}
            color={colors.primary}
          />
        </View>

        <View
          style={styles.subjectInfo}
        >
          <Text
            numberOfLines={2}
            style={[
              styles.subjectName,
              { color: colors.text },
            ]}
          >
            {subject.subject}
          </Text>

          <Text
            style={[
              styles.subjectDetail,
              { color: colors.muted },
            ]}
          >
            Total:{' '}
            {hasTotal ? total : '-'}/
            {maximum}
          </Text>
        </View>

        <View
          style={styles.subjectGrade}
        >
          <Text
            style={[
              styles.subjectPercentage,
              { color: gradeColor },
            ]}
          >
            {hasTotal
              ? `${percentage.toFixed(1)}%`
              : '-'}
          </Text>

          <View
            style={[
              styles.gradeBadge,
              {
                backgroundColor:
                  gradeBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.gradeText,
                { color: gradeColor },
              ]}
            >
              {grade}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.marksGrid}>
        <MarkItem
          label="Assignment"
          value={subject.assignment}
          colors={colors}
        />

        <MarkItem
          label="Sessional 1"
          value={subject.sessional1}
          colors={colors}
        />

        <MarkItem
          label="Sessional 2"
          value={subject.sessional2}
          colors={colors}
        />

        <MarkItem
          label="End Sem"
          value={subject.endSem}
          colors={colors}
        />
      </View>
    </View>
  );
}

function MarkItem({
  label,
  value,
  colors,
}: {
  label: string;
  value?: number | string | null;
  colors: Colors;
}) {
  return (
    <View
      style={[
        styles.markItem,
        {
          backgroundColor:
            colors.cardSoft,
          borderColor:
            colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.markValue,
          { color: colors.text },
        ]}
      >
        {value ?? '-'}
      </Text>

      <Text
        style={[
          styles.markLabel,
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
            backgroundColor:
              colors.primarySoft,
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

  performanceCard: {
    minHeight: 190,
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  performanceLeft: {
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

  scoreText: {
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

  subjectGrade: {
    alignItems: 'flex-end',
  },

  subjectPercentage: {
    fontSize: 17,
    fontWeight: '900',
  },

  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    marginTop: 3,
  },

  gradeText: {
    fontSize: 9,
    fontWeight: '900',
  },

  marksGrid: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingBottom: 15,
  },

  markItem: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },

  markValue: {
    fontSize: 14,
    fontWeight: '900',
  },

  markLabel: {
    fontSize: 7,
    fontWeight: '700',
    marginTop: 2,
  },

  divider: {
    height: 1,
    marginLeft: 65,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
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

  historyTitle: {
    fontSize: 13,
    fontWeight: '900',
  },

  historySubtitle: {
    fontSize: 10,
    marginTop: 3,
  },

  historyRight: {
    alignItems: 'flex-end',
  },

  historyPercentage: {
    fontSize: 16,
    fontWeight: '900',
  },

  historyStatus: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
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