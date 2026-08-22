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

type Subject = {
  id?: string | number;
  code?: string | null;
  name?: string | null;
  teacher_name?: string | null;
};

type SubjectsResponse = {
  subjects?: Subject[];
  available_semesters?: number[];
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
};

export default function StudentSubjects() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [selectedSemester, setSelectedSemester] =
    useState<number | null>(null);

  const [subjectsData, setSubjectsData] =
    useState<SubjectsResponse | null>(null);

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
        'STUDENT SUBJECTS SEMESTER ERROR:',
        err?.response?.data || err?.message
      );

      setSelectedSemester(1);
    }
  }, []);


  const loadSubjects = useCallback(async () => {
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
        throw new Error(
          'Student account information is unavailable.'
        );
      }

      const response = await api.get(
        `/student/${userId}/subjects?semester=${selectedSemester}`
      );

      const data: SubjectsResponse =
        response.data &&
        typeof response.data === 'object'
          ? response.data
          : {
              subjects: [],
              available_semesters: [],
            };

      setSubjectsData(data);
    } catch (err: any) {
      console.error(
        'STUDENT SUBJECTS ERROR:',
        err?.response?.data || err?.message
      );

      setSubjectsData(null);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load your subjects.'
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
      loadSubjects();
    }
  }, [selectedSemester, loadSubjects]);


  const subjects = useMemo(
    () =>
      Array.isArray(subjectsData?.subjects)
        ? subjectsData.subjects
        : [],
    [subjectsData]
  );

  const semesters = useMemo(() => {
    const apiSemesters = Array.isArray(
      subjectsData?.available_semesters
    )
      ? subjectsData!.available_semesters!
          .map(Number)
          .filter(
            (semester) =>
              Number.isInteger(semester) &&
              semester > 0
          )
      : [];

    return Array.from(
      new Set([
        ...Array.from(
          { length: 8 },
          (_, index) => index + 1
        ),
        ...apiSemesters,
      ])
    ).sort((a, b) => a - b);
  }, [subjectsData]);

  const handleSemesterChange = (
    semester: number
  ) => {
    if (semester === selectedSemester) return;

    setSelectedSemester(semester);
    setSubjectsData(null);
    setError('');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubjects();
  };


  if (
    loading &&
    selectedSemester === null
  ) {
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
          Loading subjects...
        </Text>
      </View>
    );
  }


  if (
    error &&
    !subjectsData &&
    !loading
  ) {
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
            name="book-outline"
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
          Subjects unavailable
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
          onPress={loadSubjects}
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

            <View style={styles.headerText}>
              <Text
                style={[
                  styles.title,
                  { color: colors.text },
                ]}
              >
                Subjects
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  { color: colors.muted },
                ]}
              >
                Your academic curriculum
              </Text>
            </View>
          </View>
        </View>


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
            style={
              styles.semesterButtons
            }
          >
            {semesters.map((semester) => (
              <Pressable
                key={semester}
                onPress={() =>
                  handleSemesterChange(
                    semester
                  )
                }
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


        <View
          style={[
            styles.semesterHeaderCard,
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
              styles.semesterIcon,
              {
                backgroundColor:
                  colors.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="school-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <View
            style={styles.semesterInfo}
          >
            <Text
              style={[
                styles.semesterTitle,
                { color: colors.text },
              ]}
            >
              Semester {selectedSemester}
            </Text>

            <Text
              style={[
                styles.semesterSubtitle,
                { color: colors.muted },
              ]}
            >
              Academic subject breakdown
            </Text>
          </View>
        </View>


        <View style={styles.statsGrid}>
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
          backgroundColor: colors.primarySoft,
        },
      ]}
    >
      <Ionicons
        name="book-outline"
        size={20}
        color={colors.primary}
      />
    </View>

    <Text
      style={[
        styles.statLabel,
        { color: colors.subtle },
      ]}
    >
      TOTAL SUBJECTS
    </Text>

    <Text
      style={[
        styles.statValue,
        { color: colors.text },
      ]}
    >
      {subjects.length}
    </Text>

    <Text
      style={[
        styles.statCaption,
        { color: colors.muted },
      ]}
    >
      Subjects in semester
    </Text>
  </View>
</View>

        <View
          style={styles.sectionHeader}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text },
            ]}
          >
            My Subjects
          </Text>

          <Text
            style={[
              styles.sectionSubtitle,
              { color: colors.subtle },
            ]}
          >
            SEMESTER {selectedSemester}
          </Text>
        </View>


        {loading ? (
          <View
            style={[
              styles.inlineLoading,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
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
              Loading semester subjects...
            </Text>
          </View>
        ) : subjects.length > 0 ? (
          <View>
            {subjects.map(
              (subject, index) => {
                const subjectName =
                  subject.name?.trim() ||
                  'Unnamed Subject';

                const subjectCode =
                  subject.code?.trim() ||
                  `SUB-${String(
                    index + 1
                  ).padStart(2, '0')}`;

                const teacher =
                  subject.teacher_name?.trim() ||
                  'Faculty not assigned';

                const teacherInitial =
                  teacher !==
                    'Faculty not assigned' &&
                  teacher.length > 0
                    ? teacher
                        .charAt(0)
                        .toUpperCase()
                    : 'F';

                return (
                  <View
                    key={
                      subject.id ??
                      `${subjectCode}-${index}`
                    }
                    style={[
                      styles.subjectCard,
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
                        styles.subjectTop,
                        {
                          backgroundColor:
                            isDark
                              ? '#11182A'
                              : '#F8FAFC',
                          borderBottomColor:
                            colors.border,
                        },
                      ]}
                    >
                      <View style={styles.subjectTopRow}>
  <View
    style={[
      styles.codeBadge,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
    ]}
  >
    <Text
      style={[
        styles.codeText,
        {
          color: colors.text,
        },
      ]}
    >
      {subjectCode}
    </Text>
  </View>
</View>

                      <Text
                        style={[
                          styles.subjectName,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {subjectName}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.subjectBottom
                      }
                    >
                      <View
                        style={[
                          styles.teacherAvatar,
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
                            styles.teacherInitial,
                            {
                              color:
                                colors.primary,
                            },
                          ]}
                        >
                          {teacherInitial}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.teacherInfo
                        }
                      >
                        <Text
                          style={[
                            styles.teacherLabel,
                            {
                              color:
                                colors.subtle,
                            },
                          ]}
                        >
                          INSTRUCTOR
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.teacherName,
                            {
                              color:
                                colors.text,
                            },
                          ]}
                        >
                          {teacher}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }
            )}
          </View>
        ) : (

          <View
            style={[
              styles.emptyState,
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
                styles.emptyIcon,
                {
                  backgroundColor:
                    colors.primarySoft,
                },
              ]}
            >
              <Ionicons
                name="book-outline"
                size={27}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text },
              ]}
            >
              No Subjects Found
            </Text>

            <Text
              style={[
                styles.emptyMessage,
                { color: colors.muted },
              ]}
            >
              No subjects are currently
              listed in the database for
              Semester {selectedSemester}.
            </Text>
          </View>
        )}

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
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

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
  },

  subtitle: {
    fontSize: 12,
    marginTop: 3,
  },


  filterBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
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


  semesterHeaderCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  semesterIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  semesterInfo: {
    flex: 1,
    marginLeft: 12,
  },

  semesterTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  semesterSubtitle: {
    fontSize: 10,
    marginTop: 3,
  },


statsGrid: {
  flexDirection: 'row',
  marginBottom: 26,
},

statCard: {
  width: '48%',
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


  subjectCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },

  subjectTop: {
    padding: 16,
    borderBottomWidth: 1,
  },

  subjectTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },

  codeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  subjectName: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },

  subjectBottom: {
    minHeight: 72,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  teacherInitial: {
    fontSize: 15,
    fontWeight: '900',
  },

  teacherInfo: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 10,
  },

  teacherLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  teacherName: {
    fontSize: 12,
    fontWeight: '800',
  },


  inlineLoading: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inlineLoadingText: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
  },


  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 50,
    borderWidth: 1,
    borderRadius: 20,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  emptyMessage: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
  },

  bottomSpace: {
    height: 20,
  },
});