import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  subject_name: string;
  subject_code?: string;
  semester: number | string;
  course_name?: string;
};

type Student = {
  id: number | string;
  student_id?: number | string;
  name: string;
  roll?: string;
  roll_number?: string;
  score: number | string;
};

type Ledger = {
  classId: number | string;
  type: string;
  date: string;
  subject: string;
  semester: number | string;
  course: string;
  max: number;
  avg: number;
  status: string;
};

type PickerOption = {
  value: string;
  title: string;
  sub?: string;
};

const ASSESSMENTS = [
  {
    value: 'Assignment',
    label: 'Assignment',
    max: 10,
  },
  {
    value: 'Sessional 1',
    label: 'Sessional 1',
    max: 10,
  },
  {
    value: 'Sessional 2',
    label: 'Sessional 2',
    max: 10,
  },
  {
    value: 'End Sem',
    label: 'End Semester Exam',
    max: 70,
  },
];

const gradeFor = (
  score: number | string,
  max: number
): string => {
  if (
    score === '' ||
    score === null ||
    score === undefined ||
    !max
  ) {
    return '-';
  }

  const percentage = (Number(score) / max) * 100;

  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 40) return 'D';

  return 'F';
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

export default function TeacherMarks() {
  const { isDark } = useAppTheme();

  const c = isDark
    ? {
        bg: '#020617',
        card: '#0F172A',
        soft: '#111C31',
        border: '#1E293B',
        text: '#F8FAFC',
        muted: '#94A3B8',
        primary: '#3B82F6',
        primarySoft: '#172554',
        success: '#10B981',
        danger: '#F43F5E',
        input: '#0B1220',
      }
    : {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        soft: '#F1F5F9',
        border: '#E2E8F0',
        text: '#0F172A',
        muted: '#64748B',
        primary: '#2563EB',
        primarySoft: '#EFF6FF',
        success: '#10B981',
        danger: '#E11D48',
        input: '#F8FAFC',
      };

  const [userId, setUserId] = useState<
    string | number | undefined
  >();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [ledger, setLedger] = useState<Ledger[]>([]);

  const [mode, setMode] = useState<'entry' | 'ledger'>(
    'entry'
  );

  const [semester, setSemester] = useState('All');
  const [subjectId, setSubjectId] = useState('');
  const [assessment, setAssessment] =
    useState('Assignment');
  const [maxScore, setMaxScore] = useState(10);

  const [roster, setRoster] = useState<Student[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [picker, setPicker] = useState<
    | 'semester'
    | 'subject'
    | 'assessment'
    | 'ledgerSemester'
    | 'ledgerSubject'
    | null
  >(null);

  const [ledgerSemester, setLedgerSemester] =
    useState('All');

  const [ledgerSubject, setLedgerSubject] =
    useState('All');

  const [detail, setDetail] = useState<Ledger | null>(
    null
  );

  const [detailRoster, setDetailRoster] = useState<
    Student[]
  >([]);

  const [detailOpen, setDetailOpen] = useState(false);

 

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const raw = await getItem('authUser');

      if (!raw) {
        throw new Error('No user session');
      }

      const user = JSON.parse(raw);

      setUserId(user.id);

      const [subjectsResponse, ledgerResponse] =
        await Promise.all([
          api.get(
            `/teacher/${user.id}/assigned-subjects`
          ),
          api.get(
            `/teacher/${user.id}/marks-ledger`
          ),
        ]);

      setSubjects(
        Array.isArray(subjectsResponse.data)
          ? subjectsResponse.data
          : []
      );

      setLedger(
        Array.isArray(ledgerResponse.data)
          ? ledgerResponse.data
          : []
      );
    } catch (error) {
      console.error(
        'Teacher marks loading error:',
        error
      );

      Alert.alert(
        'Unable to load marks',
        'Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

 

  const semesters = useMemo(() => {
    const values = Array.from(
      new Set(
        subjects.map((subject) =>
          String(subject.semester)
        )
      )
    ).sort(
      (a, b) => Number(a) - Number(b)
    );

    return ['All', ...values];
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    if (semester === 'All') {
      return subjects;
    }

    return subjects.filter(
      (subject) =>
        String(subject.semester) === semester
    );
  }, [subjects, semester]);

  const selectedSubject = subjects.find(
    (subject) =>
      String(subject.id) === subjectId
  );

 

  const ledgerSubjects = useMemo(() => {
    return Array.from(
      new Set(
        ledger.map((item) => item.subject)
      )
    );
  }, [ledger]);

  const filteredLedger = useMemo(() => {
    return ledger.filter((item) => {
      const semesterMatch =
        ledgerSemester === 'All' ||
        String(item.semester) ===
          ledgerSemester;

      const subjectMatch =
        ledgerSubject === 'All' ||
        item.subject === ledgerSubject;

      return semesterMatch && subjectMatch;
    });
  }, [
    ledger,
    ledgerSemester,
    ledgerSubject,
  ]);

 

  const setAssessmentType = (
    value: string
  ) => {
    const selectedAssessment =
      ASSESSMENTS.find(
        (item) => item.value === value
      ) || ASSESSMENTS[0];

    setAssessment(value);
    setMaxScore(selectedAssessment.max);
    setSheetOpen(false);
    setPicker(null);
  };

 

  const openSheet = async () => {
    if (!subjectId) {
      Alert.alert(
        'Select a subject',
        'Choose a subject before opening the grading sheet.'
      );

      return;
    }

    try {
      setOpening(true);

      const [
        rosterResponse,
        marksResponse,
      ] = await Promise.all([
        api.get(
          `/subjects/${subjectId}/students`
        ),
        api.get(
          `/marks/details?subject_id=${subjectId}&exam_type=${encodeURIComponent(
            assessment
          )}`
        ),
      ]);

      const students = Array.isArray(
        rosterResponse.data
      )
        ? rosterResponse.data
        : [];

      const marks = Array.isArray(
        marksResponse.data
      )
        ? marksResponse.data
        : [];

      if (!students.length) {
        Alert.alert(
          'No students',
          'There are no students enrolled in this subject yet.'
        );

        return;
      }

      if (marks[0]?.max_score) {
        setMaxScore(
          Number(marks[0].max_score)
        );
      }

      const mappedStudents: Student[] =
        students.map((student: any) => {
          const id =
            student.student_id ??
            student.id;

          const existingMark =
            marks.find(
              (mark: any) =>
                String(
                  mark.student_id ??
                    mark.id
                ) === String(id)
            );

          return {
            ...student,
            id,
            roll_number:
              student.roll_number ??
              student.roll ??
              '',
            score:
              existingMark?.score ??
              '',
          };
        });

      setRoster(mappedStudents);
      setSheetOpen(true);
    } catch (error) {
      console.error(
        'Open grading sheet error:',
        error
      );

      Alert.alert(
        'Unable to open grading sheet',
        'The student roster could not be loaded.'
      );
    } finally {
      setOpening(false);
    }
  };

 

  const updateScore = (
    id: string | number,
    value: string
  ) => {
    if (value === '') {
      setRoster((current) =>
        current.map((student) =>
          String(student.id) ===
          String(id)
            ? {
                ...student,
                score: '',
              }
            : student
        )
      );

      return;
    }

    const numericValue = Number(value);

    if (
      !Number.isFinite(numericValue) ||
      numericValue < 0
    ) {
      return;
    }

    if (numericValue > maxScore) {
      Alert.alert(
        'Invalid score',
        `Maximum score is ${maxScore}.`
      );

      return;
    }

    setRoster((current) =>
      current.map((student) =>
        String(student.id) ===
        String(id)
          ? {
              ...student,
              score: numericValue,
            }
          : student
      )
    );
  };

 

  const save = async () => {
    const enteredStudents =
      roster.filter(
        (student) =>
          student.score !== '' &&
          student.score !== null
      );

    if (!enteredStudents.length) {
      Alert.alert(
        'Nothing to save',
        'Enter at least one score before saving.'
      );

      return;
    }

    try {
      setSaving(true);

      await api.post('/marks', {
        subject_id: subjectId,
        exam_type: assessment,
        max_score: maxScore,
        marks: roster,
        uploaded_by_user_id: userId,
      });

      Alert.alert(
        'Marks saved',
        'Marks have been successfully published.'
      );

      setSheetOpen(false);
      setRoster([]);
      setMode('ledger');

      const response = await api.get(
        `/teacher/${userId}/marks-ledger`
      );

      setLedger(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error(
        'Save marks error:',
        error
      );

      Alert.alert(
        'Save failed',
        'The marks could not be saved. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

 

  const viewRecord = async (
    record: Ledger
  ) => {
    try {
      const response =
        await api.get(
          `/marks/details?subject_id=${record.classId}&exam_type=${encodeURIComponent(
            record.type
          )}`
        );

      setDetailRoster(
        Array.isArray(response.data)
          ? response.data
          : []
      );

      setDetail(record);
      setDetailOpen(true);
    } catch (error) {
      console.error(
        'View record error:',
        error
      );

      Alert.alert(
        'Unable to load record',
        'The published marks could not be loaded.'
      );
    }
  };

 

  const editRecord = (
    record: Ledger
  ) => {
    setMode('entry');

    setSemester(
      String(record.semester)
    );

    setSubjectId(
      String(record.classId)
    );

    setAssessment(
      record.type
    );

    setMaxScore(
      Number(record.max)
    );

    setTimeout(() => {
      openSheet();
    }, 100);
  };

 

  const choose = (
    value: string
  ) => {
    if (picker === 'semester') {
      setSemester(value);
      setSubjectId('');
      setSheetOpen(false);
    }

    if (picker === 'subject') {
      setSubjectId(value);
      setSheetOpen(false);
    }

    if (picker === 'assessment') {
      setAssessmentType(value);
    }

    if (picker === 'ledgerSemester') {
      setLedgerSemester(value);
    }

    if (picker === 'ledgerSubject') {
      setLedgerSubject(value);
    }

    setPicker(null);
  };

 

  const pickerItems = (): PickerOption[] => {
    if (
      picker === 'semester' ||
      picker === 'ledgerSemester'
    ) {
      return semesters.map(
        (value) => ({
          value,
          title:
            value === 'All'
              ? 'All Semesters'
              : `Semester ${value}`,
        })
      );
    }

    if (picker === 'subject') {
      return filteredSubjects.map(
        (subject) => ({
          value: String(subject.id),
          title: subject.subject_name,
          sub: `${
            subject.subject_code ||
            'No code'
          } • Semester ${
            subject.semester
          }`,
        })
      );
    }

    if (picker === 'assessment') {
      return ASSESSMENTS.map(
        (item) => ({
          value: item.value,
          title: item.label,
          sub: `Maximum ${item.max} marks`,
        })
      );
    }

    return [
      {
        value: 'All',
        title: 'All Subjects',
      },
      ...ledgerSubjects.map(
        (subject) => ({
          value: subject,
          title: subject,
        })
      ),
    ];
  };

  const selectedPickerValue =
    picker === 'semester'
      ? semester
      : picker === 'subject'
        ? subjectId
        : picker === 'assessment'
          ? assessment
          : picker ===
              'ledgerSemester'
            ? ledgerSemester
            : ledgerSubject;

 

  const PickerModal = picker ? (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={() =>
        setPicker(null)
      }
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() =>
            setPicker(null)
          }
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor:
                c.card,
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              {
                backgroundColor:
                  c.border,
              },
            ]}
          />

          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.sheetTitle,
                  { color: c.text },
                ]}
              >
                {picker ===
                'subject'
                  ? 'Select Subject'
                  : picker ===
                      'assessment'
                    ? 'Select Assessment'
                    : picker ===
                        'semester' ||
                        picker ===
                          'ledgerSemester'
                      ? 'Select Semester'
                      : 'Select Subject'}
              </Text>

              <Text
                style={[
                  styles.small,
                  { color: c.muted },
                ]}
              >
                Choose one option
              </Text>
            </View>

            <Pressable
              onPress={() =>
                setPicker(null)
              }
            >
              <Ionicons
                name="close-circle-outline"
                size={26}
                color={c.muted}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={{
              gap: 8,
              paddingBottom: 10,
            }}
          >
            {pickerItems().map(
              (item) => {
                const active =
                  item.value ===
                  selectedPickerValue;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() =>
                      choose(
                        item.value
                      )
                    }
                    style={[
                      styles.option,
                      {
                        backgroundColor:
                          active
                            ? c.primarySoft
                            : c.input,
                        borderColor:
                          active
                            ? c.primary
                            : c.border,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={[
                          styles.optionTitle,
                          {
                            color:
                              active
                                ? c.primary
                                : c.text,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>

                      {item.sub ? (
                        <Text
                          style={[
                            styles.small,
                            {
                              color:
                                c.muted,
                              marginTop: 2,
                            },
                          ]}
                        >
                          {item.sub}
                        </Text>
                      ) : null}
                    </View>

                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color={
                          c.primary
                        }
                      />
                    )}
                  </Pressable>
                );
              }
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  ) : null;

 

const Field = ({
  label,
  value,
  sub,
  icon,
  onPress,
  disabled = false,
  c,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  c: {
    bg: string;
    card: string;
    soft: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
    primarySoft: string;
    success: string;
    danger: string;
    input: string;
  };
}) => {
    return (
      <View
        style={{
          marginBottom: 12,
        }}
      >
        <Text
          style={[
            styles.label,
            {
              color: c.muted,
            },
          ]}
        >
          {label}
        </Text>

        <Pressable
          disabled={disabled}
          onPress={onPress}
          style={[
            styles.field,
            {
              backgroundColor:
                c.input,
              borderColor:
                c.border,
              opacity: disabled
                ? 0.5
                : 1,
            },
          ]}
        >
          <View
            style={{
              flexDirection:
                'row',
              alignItems:
                'center',
              gap: 9,
              flex: 1,
            }}
          >
            {icon && (
              <Ionicons
                name={icon}
                size={18}
                color={
                  c.primary
                }
              />
            )}

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                numberOfLines={
                  1
                }
                style={[
                  styles.fieldText,
                  {
                    color:
                      c.text,
                  },
                ]}
              >
                {value}
              </Text>

              {sub && (
                <Text
                  style={[
                    styles.small,
                    {
                      color:
                        c.muted,
                      marginTop: 2,
                    },
                  ]}
                >
                  {sub}
                </Text>
              )}
            </View>
          </View>

          <Ionicons
            name="chevron-down"
            size={18}
            color={c.muted}
          />
        </Pressable>
      </View>
    );
  };

 

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              c.bg,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={c.primary}
        />

        <Text
          style={[
            styles.small,
            {
              color: c.muted,
              marginTop: 10,
            },
          ]}
        >
          Loading marks...
        </Text>
      </View>
    );
  }

 

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
      }}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor:
              c.bg,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                refresh
              }
              tintColor={
                c.primary
              }
            />
          }
          contentContainerStyle={
            styles.content
          }
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color:
                      c.text,
                  },
                ]}
              >
                {mode ===
                'entry'
                  ? 'Marks Entry'
                  : 'Gradebook Ledger'}
              </Text>

              <Text
                style={[
                  styles.small,
                  {
                    color:
                      c.muted,
                    marginTop: 4,
                  },
                ]}
              >
                {mode ===
                'entry'
                  ? 'Enter and publish marks for your assigned subjects.'
                  : 'Review published assessment history.'}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setMode(
                  mode ===
                    'entry'
                    ? 'ledger'
                    : 'entry'
                );

                setSheetOpen(
                  false
                );
              }}
              style={[
                styles.headerButton,
                {
                  backgroundColor:
                    c.card,
                  borderColor:
                    c.border,
                },
              ]}
            >
              <Ionicons
                name={
                  mode ===
                  'entry'
                    ? 'time-outline'
                    : 'arrow-back-outline'
                }
                size={17}
                color={
                  c.primary
                }
              />

              <Text
                style={[
                  styles.headerButtonText,
                  {
                    color:
                      c.text,
                  },
                ]}
              >
                {mode ===
                'entry'
                  ? 'Ledger'
                  : 'Marks Entry'}
              </Text>
            </Pressable>
          </View>

          {/* MARKS ENTRY */}

          {mode ===
          'entry' ? (
            <>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      c.card,
                    borderColor:
                      c.border,
                  },
                ]}
              >
                <View
                  style={
                    styles.sectionHead
                  }
                >
                  <View
                    style={[
                      styles.step,
                      {
                        backgroundColor:
                          c.primarySoft,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          c.primary,
                        fontWeight:
                          '900',
                        fontSize: 12,
                      }}
                    >
                      1
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          color:
                            c.text,
                        },
                      ]}
                    >
                      Assessment Setup
                    </Text>

                    <Text
                      style={[
                        styles.small,
                        {
                          color:
                            c.muted,
                          marginTop: 2,
                        },
                      ]}
                    >
                      Choose semester, subject and assessment.
                    </Text>
                  </View>
                </View>

                <Field
                  label="SEMESTER"
                  value={
                    semester ===
                    'All'
                      ? 'All Semesters'
                      : `Semester ${semester}`
                  }
                  icon="layers-outline"
                  onPress={() =>
                    setPicker(
                      'semester'
                    )
                  }
                  c={c}
                />

                <Field
                  label="SUBJECT"
                  value={
                    selectedSubject
                      ?.subject_name ||
                    'Choose a subject'
                  }
                  sub={
                    selectedSubject
                      ? `${
                          selectedSubject.subject_code ||
                          'No code'
                        } • Semester ${
                          selectedSubject.semester
                        }`
                      : undefined
                  }
                  icon="book-outline"
                  onPress={() =>
                    setPicker(
                      'subject'
                    )
                  }
                  disabled={
                    filteredSubjects.length ===
                    0
                  }
                  c={c}
                />

                <Field
                  label="ASSESSMENT TYPE"
                  value={
                    ASSESSMENTS.find(
                      (item) =>
                        item.value ===
                        assessment
                    )?.label ||
                    assessment
                  }
                  sub={`Maximum ${maxScore} marks`}
                  icon="clipboard-outline"
                  onPress={() =>
                    setPicker(
                      'assessment'
                    )
                  }
                  c={c}
                />

                <View
                  style={[
                    styles.maxBox,
                    {
                      backgroundColor:
                        c.soft,
                      borderColor:
                        c.border,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.label,
                        {
                          color:
                            c.muted,
                          marginBottom: 2,
                        },
                      ]}
                    >
                      MAXIMUM SCORE
                    </Text>

                    <Text
                      style={[
                        styles.maxValue,
                        {
                          color:
                            c.text,
                        },
                      ]}
                    >
                      {maxScore}
                    </Text>
                  </View>

                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={
                      c.muted
                    }
                  />
                </View>

                <Pressable
                  onPress={
                    openSheet
                  }
                  disabled={
                    opening ||
                    !subjectId
                  }
                  style={[
                    styles.primary,
                    {
                      backgroundColor:
                        c.primary,
                      opacity:
                        opening ||
                        !subjectId
                          ? 0.5
                          : 1,
                    },
                  ]}
                >
                  {opening ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.primaryText
                        }
                      >
                        Open Grading Sheet
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* GRADING SHEET */}

              {sheetOpen ? (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor:
                        c.card,
                      borderColor:
                        c.border,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.sectionHead
                    }
                  >
                    <View
                      style={[
                        styles.step,
                        {
                          backgroundColor:
                            c.primarySoft,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            c.primary,
                          fontWeight:
                            '900',
                          fontSize: 12,
                        }}
                      >
                        2
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={[
                          styles.sectionTitle,
                          {
                            color:
                              c.text,
                          },
                        ]}
                      >
                        Student Roster
                      </Text>

                      <Text
                        style={[
                          styles.small,
                          {
                            color:
                              c.muted,
                          },
                        ]}
                      >
                        {
                          roster.length
                        }{' '}
                        students •{' '}
                        {
                          roster.filter(
                            (
                              student
                            ) =>
                              student.score !==
                                '' &&
                              student.score !==
                                null
                          ).length
                        }{' '}
                        scores entered
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            c.primarySoft,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            c.primary,
                          fontSize: 8,
                          fontWeight:
                            '900',
                        }}
                      >
                        {assessment}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      gap: 8,
                    }}
                  >
                    {roster.map(
                      (student) => {
                        const grade =
                          gradeFor(
                            student.score,
                            maxScore
                          );

                        return (
                          <View
                            key={String(
                              student.id
                            )}
                            style={[
                              styles.student,
                              {
                                backgroundColor:
                                  c.input,
                                borderColor:
                                  c.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.avatar,
                                {
                                  backgroundColor:
                                    c.primarySoft,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color:
                                    c.primary,
                                  fontWeight:
                                    '900',
                                  fontSize: 10,
                                }}
                              >
                                {getInitials(
                                  student.name
                                )}
                              </Text>
                            </View>

                            <View
                              style={{
                                flex: 1,
                              }}
                            >
                              <Text
                                numberOfLines={
                                  1
                                }
                                style={[
                                  styles.studentName,
                                  {
                                    color:
                                      c.text,
                                  },
                                ]}
                              >
                                {
                                  student.name
                                }
                              </Text>

                              <Text
                                style={[
                                  styles.small,
                                  {
                                    color:
                                      c.muted,
                                  },
                                ]}
                              >
                                Roll No.{' '}
                                {student.roll_number ||
                                  student.roll ||
                                  'Not Assigned'}
                              </Text>
                            </View>

                            <View
                              style={{
                                alignItems:
                                  'flex-end',
                              }}
                            >
                              <View
                                style={{
                                  flexDirection:
                                    'row',
                                  alignItems:
                                    'center',
                                }}
                              >
                                <TextInput
                                  value={
                                    student.score ===
                                      '' ||
                                    student.score ===
                                      null
                                      ? ''
                                      : String(
                                          student.score
                                        )
                                  }
                                  onChangeText={(
                                    value
                                  ) =>
                                    updateScore(
                                      student.id,
                                      value
                                    )
                                  }
                                  placeholder="-"
                                  placeholderTextColor={
                                    c.muted
                                  }
                                  keyboardType={
                                    Platform.OS ===
                                    'ios'
                                      ? 'decimal-pad'
                                      : 'numeric'
                                  }
                                  style={[
                                    styles.score,
                                    {
                                      color:
                                        c.text,
                                      backgroundColor:
                                        c.card,
                                      borderColor:
                                        c.border,
                                    },
                                  ]}
                                />

                                <Text
                                  style={[
                                    styles.small,
                                    {
                                      color:
                                        c.muted,
                                      marginLeft: 4,
                                    },
                                  ]}
                                >
                                  /{' '}
                                  {
                                    maxScore
                                  }
                                </Text>
                              </View>

                              <Text
                                style={[
                                  styles.grade,
                                  {
                                    color:
                                      grade ===
                                      'F'
                                        ? c.danger
                                        : grade ===
                                            '-'
                                          ? c.muted
                                          : c.success,
                                  },
                                ]}
                              >
                                {
                                  grade
                                }
                              </Text>
                            </View>
                          </View>
                        );
                      }
                    )}
                  </View>

                  <View
                    style={[
                      styles.saveRow,
                      {
                        backgroundColor:
                          c.soft,
                        borderColor:
                          c.border,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={[
                          styles.studentName,
                          {
                            color:
                              c.text,
                          },
                        ]}
                      >
                        Publish marks
                      </Text>

                      <Text
                        style={[
                          styles.small,
                          {
                            color:
                              c.muted,
                          },
                        ]}
                      >
                        {
                          roster.filter(
                            (
                              student
                            ) =>
                              student.score !==
                              ''
                          ).length
                        }{' '}
                        scores entered
                      </Text>
                    </View>

                    <Pressable
                      onPress={
                        save
                      }
                      disabled={
                        saving
                      }
                      style={[
                        styles.save,
                        {
                          backgroundColor:
                            c.primary,
                          opacity:
                            saving
                              ? 0.5
                              : 1,
                        },
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator
                          color="#FFFFFF"
                          size="small"
                        />
                      ) : (
                        <Ionicons
                          name="cloud-upload-outline"
                          size={17}
                          color="#FFFFFF"
                        />
                      )}

                      <Text
                        style={
                          styles.saveText
                        }
                      >
                        {saving
                          ? 'Saving'
                          : 'Save Marks'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.empty,
                    {
                      backgroundColor:
                        c.card,
                      borderColor:
                        c.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={32}
                    color={
                      c.muted
                    }
                  />

                  <Text
                    style={[
                      styles.emptyTitle,
                      {
                        color:
                          c.text,
                      },
                    ]}
                  >
                    Grading sheet ready
                  </Text>

                  <Text
                    style={[
                      styles.small,
                      {
                        color:
                          c.muted,
                        textAlign:
                          'center',
                      },
                    ]}
                  >
                    Select a semester,
                    subject and assessment,
                    then open the grading sheet.
                  </Text>
                </View>
              )}
            </>
          ) : (
           

            <>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      c.card,
                    borderColor:
                      c.border,
                  },
                ]}
              >
                <View
                  style={
                    styles.sectionHead
                  }
                >
                  <View
                    style={[
                      styles.icon,
                      {
                        backgroundColor:
                          c.primarySoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={19}
                      color={
                        c.primary
                      }
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          color:
                            c.text,
                        },
                      ]}
                    >
                      Gradebook Ledger
                    </Text>

                    <Text
                      style={[
                        styles.small,
                        {
                          color:
                            c.muted,
                        },
                      ]}
                    >
                      Review published assessment history.
                    </Text>
                  </View>
                </View>

                <Field
                  label="SEMESTER"
                  value={
                    ledgerSemester ===
                    'All'
                      ? 'All Semesters'
                      : `Semester ${ledgerSemester}`
                  }
                  icon="layers-outline"
                  onPress={() =>
                    setPicker(
                      'ledgerSemester'
                    )
                  }
                  c={c}
                />

                <Field
                  label="SUBJECT"
                  value={
                    ledgerSubject ===
                    'All'
                      ? 'All Subjects'
                      : ledgerSubject
                  }
                  icon="book-outline"
                  onPress={() =>
                    setPicker(
                      'ledgerSubject'
                    )
                  }
                  c={c}
                />
              </View>

              {filteredLedger.length ===
              0 ? (
                <View
                  style={[
                    styles.empty,
                    {
                      backgroundColor:
                        c.card,
                      borderColor:
                        c.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="file-tray-outline"
                    size={32}
                    color={
                      c.muted
                    }
                  />

                  <Text
                    style={[
                      styles.emptyTitle,
                      {
                        color:
                          c.text,
                      },
                    ]}
                  >
                    No marks published yet
                  </Text>

                  <Text
                    style={[
                      styles.small,
                      {
                        color:
                          c.muted,
                        textAlign:
                          'center',
                      },
                    ]}
                  >
                    Published assessments will appear here.
                  </Text>
                </View>
              ) : (
                filteredLedger.map(
                  (record, index) => {
                    const percentage =
                      record.max
                        ? Math.round(
                            (Number(
                              record.avg
                            ) /
                              Number(
                                record.max
                              )) *
                              100
                          )
                        : 0;

                    return (
                      <View
                        key={`${record.classId}-${record.type}-${index}`}
                        style={[
                          styles.ledger,
                          {
                            backgroundColor:
                              c.card,
                            borderColor:
                              c.border,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.ledgerHead
                          }
                        >
                          <View
                            style={[
                              styles.icon,
                              {
                                backgroundColor:
                                  c.primarySoft,
                              },
                            ]}
                          >
                            <Ionicons
                              name="clipboard-outline"
                              size={19}
                              color={
                                c.primary
                              }
                            />
                          </View>

                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={[
                                styles.studentName,
                                {
                                  color:
                                    c.text,
                                },
                              ]}
                            >
                              {
                                record.type
                              }
                            </Text>

                            <Text
                              style={[
                                styles.small,
                                {
                                  color:
                                    c.muted,
                                },
                              ]}
                            >
                              {
                                record.date
                              }
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.published,
                              {
                                backgroundColor:
                                  isDark
                                    ? '#052E25'
                                    : '#ECFDF5',
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color:
                                  c.success,
                                fontSize: 8,
                                fontWeight:
                                  '900',
                              }}
                            >
                              PUBLISHED
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.divider,
                            {
                              backgroundColor:
                                c.border,
                            },
                          ]}
                        />

                        <Text
                          style={[
                            styles.ledgerSubject,
                            {
                              color:
                                c.text,
                            },
                          ]}
                        >
                          {
                            record.subject
                          }
                        </Text>

                        <Text
                          style={[
                            styles.small,
                            {
                              color:
                                c.muted,
                              marginTop: 3,
                            },
                          ]}
                        >
                          {
                            record.course
                          }{' '}
                          • Semester{' '}
                          {
                            record.semester
                          }
                        </Text>

                        <View
                          style={{
                            marginTop: 12,
                          }}
                        >
                          <Text
                            style={[
                              styles.label,
                              {
                                color:
                                  c.muted,
                              },
                            ]}
                          >
                            CLASS AVERAGE
                          </Text>

                          <Text
                            style={[
                              styles.maxValue,
                              {
                                color:
                                  c.text,
                              },
                            ]}
                          >
                            {
                              record.avg
                            }{' '}
                            <Text
                              style={[
                                styles.small,
                                {
                                  color:
                                    c.muted,
                                },
                              ]}
                            >
                              /{' '}
                              {
                                record.max
                              }
                            </Text>
                          </Text>

                          <View
                            style={[
                              styles.track,
                              {
                                backgroundColor:
                                  c.soft,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.fill,
                                {
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      percentage
                                    )
                                  )}%`,
                                  backgroundColor:
                                    percentage >=
                                    75
                                      ? c.success
                                      : percentage >=
                                          50
                                        ? '#F59E0B'
                                        : c.danger,
                                },
                              ]}
                            />
                          </View>
                        </View>

                        <View
                          style={
                            styles.actions
                          }
                        >
                          <Pressable
                            onPress={() =>
                              viewRecord(
                                record
                              )
                            }
                            style={[
                              styles.action,
                              {
                                borderColor:
                                  c.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name="eye-outline"
                              size={16}
                              color={
                                c.primary
                              }
                            />

                            <Text
                              style={{
                                color:
                                  c.primary,
                                fontSize: 9,
                                fontWeight:
                                  '900',
                              }}
                            >
                              View
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              editRecord(
                                record
                              )
                            }
                            style={[
                              styles.action,
                              {
                                borderColor:
                                  c.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name="create-outline"
                              size={16}
                              color={
                                c.muted
                              }
                            />

                            <Text
                              style={{
                                color:
                                  c.muted,
                                fontSize: 9,
                                fontWeight:
                                  '900',
                              }}
                            >
                              Edit
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }
                )
              )}
            </>
          )}
        </ScrollView>

        {PickerModal}

        {/* DETAIL MODAL */}

        <Modal
          transparent
          animationType="slide"
          visible={detailOpen}
          onRequestClose={() =>
            setDetailOpen(false)
          }
        >
          <View
            style={styles.backdrop}
          >
            <Pressable
              style={
                StyleSheet.absoluteFill
              }
              onPress={() =>
                setDetailOpen(false)
              }
            />

            <View
              style={[
                styles.sheet,
                {
                  backgroundColor:
                    c.card,
                  maxHeight:
                    '82%',
                },
              ]}
            >
              <View
                style={[
                  styles.handle,
                  {
                    backgroundColor:
                      c.border,
                  },
                ]}
              />

              <View
                style={
                  styles.sheetHead
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.sheetTitle,
                      {
                        color:
                          c.text,
                      },
                    ]}
                  >
                    {
                      detail?.type
                    }{' '}
                    Grades
                  </Text>

                  <Text
                    style={[
                      styles.small,
                      {
                        color:
                          c.muted,
                        marginTop: 2,
                      },
                    ]}
                  >
                    {
                      detail?.subject
                    }{' '}
                    •{' '}
                    {
                      detail?.course
                    }
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    setDetailOpen(
                      false
                    )
                  }
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={26}
                    color={
                      c.muted
                    }
                  />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={{
                  gap: 8,
                  paddingBottom: 10,
                }}
              >
                {detailRoster.map(
                  (student) => {
                    const grade =
                      gradeFor(
                        student.score,
                        Number(
                          detail?.max ||
                            0
                        )
                      );

                    return (
                      <View
                        key={String(
                          student.id
                        )}
                        style={[
                          styles.student,
                          {
                            backgroundColor:
                              c.input,
                            borderColor:
                              c.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.avatar,
                            {
                              backgroundColor:
                                c.primarySoft,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color:
                                c.primary,
                              fontWeight:
                                '900',
                              fontSize: 10,
                            }}
                          >
                            {getInitials(
                              student.name
                            )}
                          </Text>
                        </View>

                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={[
                              styles.studentName,
                              {
                                color:
                                  c.text,
                              },
                            ]}
                          >
                            {
                              student.name
                            }
                          </Text>

                          <Text
                            style={[
                              styles.small,
                              {
                                color:
                                  c.muted,
                              },
                            ]}
                          >
                            Roll No.{' '}
                            {student.roll_number ||
                              student.roll ||
                              'Not Assigned'}
                          </Text>
                        </View>

                        <View
                          style={{
                            alignItems:
                              'flex-end',
                          }}
                        >
                          <Text
                            style={[
                              styles.studentName,
                              {
                                color:
                                  c.text,
                              },
                            ]}
                          >
                            {
                              student.score
                            }{' '}
                            /{' '}
                            {
                              detail?.max
                            }
                          </Text>

                          <Text
                            style={[
                              styles.grade,
                              {
                                color:
                                  grade ===
                                  'F'
                                    ? c.danger
                                    : grade ===
                                        '-'
                                      ? c.muted
                                      : c.success,
                              },
                            ]}
                          >
                            {
                              grade
                            }
                          </Text>
                        </View>
                      </View>
                    );
                  }
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  small: {
    fontSize: 10,
    lineHeight: 16,
  },

  headerButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  headerButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    marginBottom: 14,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },

  step: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  label: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },

  field: {
    minHeight: 53,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  fieldText: {
    fontSize: 12,
    fontWeight: '800',
  },

  maxBox: {
    minHeight: 54,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  maxValue: {
    fontSize: 18,
    fontWeight: '900',
  },

  primary: {
    height: 49,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  primaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  empty: {
    minHeight: 220,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    gap: 7,
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 5,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  student: {
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  avatar: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  studentName: {
    fontSize: 11,
    fontWeight: '900',
  },

  score: {
    width: 52,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
    padding: 0,
  },

  grade: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },

  saveRow: {
    marginTop: 13,
    borderRadius: 13,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  save: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  ledger: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },

  ledgerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  published: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 99,
  },

  divider: {
    height: 1,
    marginVertical: 12,
  },

  ledgerSubject: {
    fontSize: 14,
    fontWeight: '900',
  },

  track: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 6,
  },

  fill: {
    height: '100%',
    borderRadius: 99,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 7,
    marginTop: 12,
  },

  action: {
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  backdrop: {
    flex: 1,
    backgroundColor:
      'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },

  sheet: {
    maxHeight: '76%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 16,
    paddingBottom: 25,
  },

  handle: {
    width: 38,
    height: 4,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 14,
  },

  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  option: {
    minHeight: 56,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  optionTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
});