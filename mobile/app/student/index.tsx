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

type Profile = {
  full_name: string;
  course_name?: string;
  semester?: string | number;
  email?: string;
  roll_number?: string;
};

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
  type: string;
  date: string;
};

type PerformancePoint = {
  semester: string;
  cgpa: number;
};

type DashboardData = {
  profile: Profile;
  upcoming_classes: UpcomingClass[];
  notices: Notice[];
  performanceData: PerformancePoint[];
};

export default function StudentDashboard() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [dashboardData, setDashboardData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = isDark
    ? {
        background: '#020617',
        card: '#0F172A',
        secondary: '#111C31',
        border: '#1E293B',
        text: '#F8FAFC',
        muted: '#94A3B8',
        primary: '#3B82F6',
        primarySoft: '#172554',
        icon: '#CBD5E1',
      }
    : {
        background: '#F8FAFC',
        card: '#FFFFFF',
        secondary: '#F1F5F9',
        border: '#E2E8F0',
        text: '#0F172A',
        muted: '#64748B',
        primary: '#2563EB',
        primarySoft: '#EFF6FF',
        icon: '#475569',
      };

  const loadDashboard = async (
    showLoader = true
  ) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const storedUser = await getItem('authUser');

      if (!storedUser) {
        console.warn(
          'No authenticated user found.'
        );
        return;
      }

      const user = JSON.parse(storedUser);

      if (!user?.id) {
        console.warn(
          'Authenticated user has no ID.'
        );
        return;
      }

      const response = await api.get(
        `/student/${user.id}/custom-dashboard`
      );

      setDashboardData(response.data);
    } catch (error: any) {
      console.error(
        'Student dashboard error:',
        error?.response?.data ||
          error?.message ||
          error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard(false);
  };

  if (loading && !dashboardData) {
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
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  if (!dashboardData) {
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
            },
          ]}
        >
          <Ionicons
            name="school-outline"
            size={30}
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
            styles.errorMessage,
            { color: colors.muted },
          ]}
        >
          We couldn't load your academic
          information.
        </Text>

        <Pressable
          onPress={() => loadDashboard()}
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

  const {
    profile,
    upcoming_classes = [],
    notices = [],
    performanceData = [],
  } = dashboardData;

  const firstName =
    profile.full_name?.split(' ')[0] ||
    'Student';

  const latestPerformance =
    performanceData.length > 0
      ? performanceData[
          performanceData.length - 1
        ]
      : null;

  return (
    <View
      style={[
        styles.container,
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
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeText}>

            <Text
              style={[
                styles.welcomeTitle,
                { color: colors.text },
              ]}
            >
              Welcome, {firstName} 
            </Text>

          </View>

          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
          >
            <Text style={styles.avatarText}>
              {profile.full_name
                ?.charAt(0)
                ?.toUpperCase() || 'S'}
            </Text>
          </View>
        </View>

        {/* Profile */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View style={styles.profileRow}>
            <View
              style={[
                styles.profileAvatar,
                {
                  backgroundColor:
                    colors.primarySoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.profileAvatarText,
                  {
                    color:
                      colors.primary,
                  },
                ]}
              >
                {profile.full_name
                  ?.charAt(0)
                  ?.toUpperCase() || 'S'}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text
                numberOfLines={1}
                style={[
                  styles.profileName,
                  { color: colors.text },
                ]}
              >
                {profile.full_name}
              </Text>

              <Text
                style={[
                  styles.profileCourse,
                  {
                    color:
                      colors.primary,
                  },
                ]}
              >
                {profile.course_name ||
                  'Student'}
                {profile.semester
                  ? ` • Sem ${profile.semester}`
                  : ''}
              </Text>

              {profile.email && (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.profileEmail,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  {profile.email}
                </Text>
              )}
            </View>
          </View>

          <View
            style={[
              styles.studentId,
              {
                backgroundColor:
                  colors.secondary,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="id-card-outline"
              size={16}
              color={colors.muted}
            />

            <View style={styles.studentIdInfo}>
              <Text
                style={[
                  styles.studentIdLabel,
                  { color: colors.muted },
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
                {profile.roll_number || '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Overview */}
        <SectionHeader
          title="Academic Overview"
          subtitle="Your key information"
          colors={colors}
        />

        <View style={styles.overviewGrid}>
          <OverviewCard
            icon="calendar-outline"
            title="Classes"
            value={String(
              upcoming_classes.length
            )}
            label="Upcoming"
            colors={colors}
          />

          <OverviewCard
            icon="notifications-outline"
            title="Notices"
            value={String(
              notices.length
            )}
            label="Recent"
            colors={colors}
          />

          <OverviewCard
            icon="school-outline"
            title="CGPA"
            value={
              latestPerformance
                ? Number(
                    latestPerformance.cgpa
                  ).toFixed(2)
                : '—'
            }
            label="Current"
            colors={colors}
          />

          <OverviewCard
            icon="book-outline"
            title="Semester"
            value={
              profile.semester
                ? String(
                    profile.semester
                  )
                : '—'
            }
            label="Current"
            colors={colors}
          />
        </View>

        <SectionHeader
          title="Upcoming Classes"
          subtitle="Next scheduled sessions"
          rightText={`${upcoming_classes.length} ${
            upcoming_classes.length === 1
              ? 'Session'
              : 'Sessions'
          }`}
          colors={colors}
        />

        <View style={styles.section}>
          {upcoming_classes.length > 0 ? (
            upcoming_classes.map(
              (classItem, index) => (
                <ClassCard
                  key={String(
                    classItem.id
                  )}
                  item={classItem}
                  first={index === 0}
                  colors={colors}
                />
              )
            )
          ) : (
            <EmptyCard
              icon="time-outline"
              message="No upcoming classes scheduled."
              colors={colors}
            />
          )}
        </View>

        <SectionHeader
          title="Academic Trajectory"
          subtitle="CGPA progression"
          colors={colors}
        />

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
            style={
              styles.performanceHeader
            }
          >
            <View>
              <Text
                style={[
                  styles.performanceLabel,
                  {
                    color:
                      colors.muted,
                  },
                ]}
              >
                CURRENT CGPA
              </Text>

              <Text
                style={[
                  styles.cgpa,
                  { color: colors.text },
                ]}
              >
                {latestPerformance
                  ? Number(
                      latestPerformance.cgpa
                    ).toFixed(2)
                  : '—'}
              </Text>
            </View>

            <View
              style={[
                styles.performanceIcon,
                {
                  backgroundColor:
                    colors.primarySoft,
                },
              ]}
            >
              <Ionicons
                name="trending-up-outline"
                size={23}
                color={
                  colors.primary
                }
              />
            </View>
          </View>

          {performanceData.length >
          0 ? (
            <View style={styles.performanceList}>
              {performanceData.map(
                (item) => {
                  const percentage = Math.min(
                    Math.max(
                      Number(
                        item.cgpa
                      ) * 10,
                      0
                    ),
                    100
                  );

                  return (
                    <View
                      key={
                        item.semester
                      }
                      style={
                        styles.performanceRow
                      }
                    >
                      <Text
                        style={[
                          styles.semester,
                          {
                            color:
                              colors.muted,
                          },
                        ]}
                      >
                        {
                          item.semester
                        }
                      </Text>

                      <View
                        style={[
                          styles.progressTrack,
                          {
                            backgroundColor:
                              colors.secondary,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${percentage}%`,
                              backgroundColor:
                                colors.primary,
                            },
                          ]}
                        />
                      </View>

                      <Text
                        style={[
                          styles.performanceValue,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {Number(
                          item.cgpa
                        ).toFixed(2)}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          ) : (
            <Text
              style={[
                styles.noData,
                { color: colors.muted },
              ]}
            >
              No academic performance
              data available.
            </Text>
          )}
        </View>

        <SectionHeader
          title="Campus Board"
          subtitle="Latest university notices"
          rightText={`${notices.length}`}
          colors={colors}
        />

        <View style={styles.section}>
          {notices.length > 0 ? (
            notices
              .slice(0, 5)
              .map((notice) => (
                <NoticeCard
                  key={String(
                    notice.id
                  )}
                  notice={notice}
                  colors={colors}
                  onPress={() => router.push('/student/notices')}
                />
              ))
          ) : (
            <EmptyCard
              icon="notifications-outline"
              message="No recent notices available."
              colors={colors}
            />
          )}
        </View>

        <Pressable
          onPress={() => router.push('/student/notices')}
          android_ripple={{ color: colors.border }}
          style={[
            styles.futureNotice,
            {
              backgroundColor:
                colors.secondary,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.muted}
          />

          <Text
            style={[
              styles.futureNoticeText,
              { color: colors.muted },
            ]}
          >
            Open the Campus Board to view all recent notices and announcements.
          </Text>
        </Pressable>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  rightText,
  colors,
}: {
  title: string;
  subtitle: string;
  rightText?: string;
  colors: any;
}) {
  return (
    <View
      style={styles.sectionHeader}
    >
      <View>
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
            { color: colors.muted },
          ]}
        >
          {subtitle}
        </Text>
      </View>

      {rightText && (
        <Text
          style={[
            styles.sectionRight,
            {
              color:
                colors.primary,
            },
          ]}
        >
          {rightText}
        </Text>
      )}
    </View>
  );
}

function OverviewCard({
  icon,
  title,
  value,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  label: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.overviewCard,
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
          styles.overviewIcon,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.overviewTitle,
          { color: colors.muted },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.overviewValue,
          { color: colors.text },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.overviewLabel,
          { color: colors.muted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ClassCard({
  item,
  first,
  colors,
}: {
  item: UpcomingClass;
  first: boolean;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.classCard,
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
          styles.classIcon,
          {
            backgroundColor: first
              ? colors.primary
              : colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name="time-outline"
          size={20}
          color={
            first
              ? '#FFFFFF'
              : colors.primary
          }
        />
      </View>

      <View style={styles.classInfo}>
        <Text
          numberOfLines={1}
          style={[
            styles.classSubject,
            { color: colors.text },
          ]}
        >
          {item.subject}
        </Text>

        <Text
          numberOfLines={2}
          style={[
            styles.classMeta,
            { color: colors.muted },
          ]}
        >
          {item.class_date_label
            ? `${item.class_date_label} • `
            : ''}
          {item.time} • {item.faculty}
        </Text>

        <View style={styles.roomRow}>
          <Ionicons
            name="location-outline"
            size={13}
            color={colors.primary}
          />

          <Text
            style={[
              styles.roomText,
              { color: colors.muted },
            ]}
          >
            {item.room}
          </Text>
        </View>
      </View>

      {first && (
        <View
          style={[
            styles.nextBadge,
            { backgroundColor: '#DCFCE7' },
          ]}
        >
          <View
            style={styles.nextDot}
          />

          <Text style={styles.nextText}>
            NEXT
          </Text>
        </View>
      )}
    </View>
  );
}

function NoticeCard({
  notice,
  colors,
  onPress,
}: {
  notice: Notice;
  colors: any;
  onPress: () => void;
}) {
  let icon: keyof typeof Ionicons.glyphMap =
    'notifications-outline';

  if (notice.type === 'Academic') {
    icon = 'calendar-outline';
  }

  if (notice.type === 'Alert') {
    icon = 'document-text-outline';
  }

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.primarySoft }}
      style={[
        styles.noticeCard,
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
          styles.noticeIcon,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>

      <View
        style={styles.noticeContent}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.noticeTitle,
            { color: colors.text },
          ]}
        >
          {notice.title}
        </Text>

        <Text
          style={[
            styles.noticeMeta,
            { color: colors.muted },
          ]}
        >
          {notice.type} • {notice.date}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.muted}
      />
    </Pressable>
  );
}

function EmptyCard({
  icon,
  message,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor:
            colors.card,
          borderColor:
            colors.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={colors.muted}
      />

      <Text
        style={[
          styles.emptyText,
          { color: colors.muted },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingTop: 24,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  errorTitle: {
    fontSize: 21,
    fontWeight: '900',
  },

  errorMessage: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  retryButton: {
    marginTop: 22,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  welcomeText: {
    flex: 1,
    paddingRight: 14,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 6,
  },

  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  welcomeSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  profileCard: {
    borderWidth: 1,
    borderRadius: 23,
    padding: 18,
    marginBottom: 28,
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileAvatarText: {
    fontSize: 23,
    fontWeight: '900',
  },

  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },

  profileName: {
    fontSize: 18,
    fontWeight: '900',
  },

  profileCourse: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  profileEmail: {
    marginTop: 4,
    fontSize: 12,
  },

  studentId: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },

  studentIdInfo: {
    marginLeft: 9,
  },

  studentIdLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  studentIdValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },

  sectionRight: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  overviewCard: {
    width: '48%',
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 19,
    padding: 14,
    marginBottom: 10,
  },

  overviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overviewTitle: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  overviewValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },

  overviewLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },

  section: {
    marginBottom: 28,
  },

  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
  },

  classIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  classInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 7,
  },

  classSubject: {
    fontSize: 14,
    fontWeight: '900',
  },

  classMeta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 15,
  },

  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  roomText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },

  nextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
  },

  nextDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },

  nextText: {
    color: '#15803D',
    fontSize: 7,
    fontWeight: '900',
  },

  performanceCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 28,
  },

  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  performanceLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  cgpa: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 3,
  },

  performanceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  performanceList: {
    gap: 12,
  },

  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  semester: {
    width: 42,
    fontSize: 10,
    fontWeight: '800',
  },

  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 10,
  },

  performanceValue: {
    width: 42,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '900',
  },

  noData: {
    fontSize: 13,
    fontStyle: 'italic',
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
  },

  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noticeContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  noticeMeta: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 5,
    textTransform: 'uppercase',
  },

  emptyCard: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  futureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
  },

  futureNoticeText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 9,
  },

  bottomSpace: {
    height: 30,
  },
});