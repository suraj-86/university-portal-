import React, { useCallback, useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';

import api from '../../services/api';
import { getItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

type ProfileData = {
  personal: {
    name: string;
    dob: string;
    blood_group: string;
    gender?: string;
    contact?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pin_code?: string;
    profile_picture?: string | null;
  };
  academic: {
    roll_no?: string;
    enrollment_no?: string;
    course?: string;
    semester?: string;
    batch?: string;
    current_cgpa?: string;
    attendance_overall?: string;
  };
  guardians: {
    father_name?: string;
    mother_name?: string;
    guardian_relation?: string;
    emergency_contact?: string;
  };
};

type Ward = {
  student_id: string | number;
  user_id?: string | number;
  full_name: string;
  course_name?: string;
  semester?: string | number;
  roll_no?: string | number | null;
  roll_number?: string | number | null;
  enrollment_no?: string | number | null;
};

type ChildProfile = {
  student_id: string | number;
  user_id: string | number;
  full_name: string;
  course_name?: string;
  semester?: string | number;
};

type OverviewResponse = {
  childProfile?: ChildProfile;
  allWards?: Ward[];
};

export default function ParentProfile() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [wardPickerOpen, setWardPickerOpen] = useState(false);

  const colors = {
    background: isDark ? '#050817' : '#F8FAFC',
    card: isDark ? '#101525' : '#FFFFFF',
    cardSoft: isDark ? '#151D31' : '#F8FAFC',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#66728B' : '#94A3B8',
    border: isDark ? '#202A42' : '#E2E8F0',
    primary: '#1764FF',
    primarySoft: isDark ? '#172554' : '#EFF6FF',
  };

  const fetchProfile = useCallback(
    async (showLoader = true) => {
      try {
        setError('');
        if (showLoader) setLoading(true);

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

        const overviewUrl = selectedWardId
          ? `/parent/${user.id}/wards-overview?student_id=${selectedWardId}`
          : `/parent/${user.id}/wards-overview`;

        const overviewResponse = await api.get(overviewUrl);
        const overview: OverviewResponse = overviewResponse.data;
        const availableWards = Array.isArray(overview?.allWards)
          ? overview.allWards
          : [];

        setWards(availableWards);

        if (!overview?.childProfile) {
          setProfile(null);
          setError('No active students are linked to your parent account.');
          return;
        }

        if (!selectedWardId && overview.childProfile.student_id != null) {
          setSelectedWardId(String(overview.childProfile.student_id));
        }

        const childUserId = overview.childProfile.user_id;
        if (childUserId == null) {
          throw new Error(
            'The selected ward account information is unavailable.'
          );
        }

        const profileResponse = await api.get(
          `/student/${childUserId}/profile`
        );

        setProfile(profileResponse.data as ProfileData);
      } catch (err: any) {
        console.error(
          'PARENT PROFILE ERROR:',
          err?.response?.data || err?.message || err
        );

        setProfile(null);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Unable to load the ward profile.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedWardId]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile(false);
  };

  const handleWardChange = (wardId: string) => {
    if (wardId === selectedWardId) return;
    setSelectedWardId(wardId);
    setProfile(null);
    setError('');
  };

  const display = (value?: string | number | null) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return 'Not available';
    }
    return String(value);
  };

  if (loading && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading ward profile...
        </Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.errorIcon,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="person-outline" size={28} color={colors.primary} />
        </View>

        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Profile unavailable
        </Text>

        <Text style={[styles.errorText, { color: colors.muted }]}>
          {error}
        </Text>

        <Pressable
          onPress={() => fetchProfile()}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) return null;

  const initials =
    profile.personal?.name?.trim()?.charAt(0)?.toUpperCase() || 'S';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
              <Ionicons name="arrow-back" size={21} color={colors.text} />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Ward Profile
              </Text>
            </View>
          </View>
        </View>

        {wards.length > 0 ? (
          <>
            <SectionTitle
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
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.wardDropdownBody}>
                <Text
                  style={[styles.wardDropdownLabel, { color: colors.subtle }]}
                >
                  CURRENT WARD
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.wardDropdownName, { color: colors.text }]}
                >
                  {wards.find(
                    (ward) =>
                      String(ward.student_id) === String(selectedWardId)
                  )?.full_name || profile.personal.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.wardDropdownMeta, { color: colors.muted }]}
                >
                  {wards.find(
                    (ward) =>
                      String(ward.student_id) === String(selectedWardId)
                  )?.course_name || profile.academic.course || 'Student'}
                  {profile.academic.semester
                    ? ` • Sem ${profile.academic.semester}`
                    : ''}
                </Text>
              </View>

              <View
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
              </View>
            </Pressable>

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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        Select Ward
                      </Text>
                      <Text
                        style={[styles.modalSubtitle, { color: colors.muted }]}
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
                      <Ionicons name="close" size={20} color={colors.text} />
                    </Pressable>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.wardOptions}
                  >
                    {wards.map((ward) => {
                      const active =
                        String(ward.student_id) === String(selectedWardId);
                      const wardRoll =
                        ward.roll_no ??
                        ward.roll_number ??
                        ward.enrollment_no ??
                        null;

                      return (
                        <Pressable
                          key={String(ward.student_id)}
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
                              name="person-outline"
                              size={19}
                              color={active ? '#FFFFFF' : colors.primary}
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
                              {ward.semester != null
                                ? ` • Sem ${ward.semester}`
                                : ''}
                            </Text>
                          </View>

                          {active ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={22}
                              color={colors.primary}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <View style={styles.wardSpacing} />
          </>
        ) : null}

        <View
          style={[
            styles.identityCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[styles.identityBanner, { backgroundColor: colors.primary }]}
          />

          <View style={styles.identityBody}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.card,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {initials}
              </Text>
            </View>

            <View style={styles.identityInfo}>
              <Text
                style={[styles.name, { color: colors.text }]}
                numberOfLines={2}
              >
                {profile.personal.name}
              </Text>

              <Text
                style={[styles.course, { color: colors.primary }]}
                numberOfLines={2}
              >
                {display(profile.academic.course)}
              </Text>

              <Text
                style={[styles.email, { color: colors.muted }]}
                numberOfLines={1}
              >
                {display(profile.personal.email)}
              </Text>

              {profile.academic.semester != null ? (
                <Text style={[styles.semester, { color: colors.muted }]}>
                {display(profile.academic.semester)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <SectionTitle
          title="Academic Information"
          subtitle="WARD'S UNIVERSITY RECORD"
          colors={colors}
        />

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <InfoRow icon="id-card-outline" label="Roll Number" value={display(profile.academic.roll_no)} colors={colors} />
          <Divider colors={colors} />
          <InfoRow icon="document-text-outline" label="Enrollment Number" value={display(profile.academic.enrollment_no)} colors={colors} />
          <Divider colors={colors} />
          <InfoRow icon="school-outline" label="Course" value={display(profile.academic.course)} colors={colors} />
          <Divider colors={colors} />
          <InfoRow icon="layers-outline" label="Semester" value={display(profile.academic.semester)} colors={colors} />
          <Divider colors={colors} />
          <InfoRow icon="calendar-outline" label="Batch" value={display(profile.academic.batch)} colors={colors} />
        </View>

        <SectionTitle
          title="Personal Information"
          subtitle="WARD'S PERSONAL DETAILS"
          colors={colors}
        />

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <ReadOnlyRow icon="person-outline" label="Full Name" value={display(profile.personal.name)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="calendar-outline" label="Date of Birth" value={display(profile.personal.dob)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="male-female-outline" label="Gender" value={display(profile.personal.gender)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="call-outline" label="Contact Number" value={display(profile.personal.contact)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="mail-outline" label="Email" value={display(profile.personal.email)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="water-outline" label="Blood Group" value={display(profile.personal.blood_group)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="location-outline" label="Address" value={display(profile.personal.address)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="business-outline" label="City" value={display(profile.personal.city)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="map-outline" label="State" value={display(profile.personal.state)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="navigate-outline" label="PIN Code" value={display(profile.personal.pin_code)} colors={colors} />
        </View>

        <SectionTitle
          title="Guardian Information"
          subtitle="WARD'S GUARDIAN DETAILS"
          colors={colors}
        />

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <ReadOnlyRow icon="person-outline" label="Father / Guardian Name" value={display(profile.guardians.father_name)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="people-outline" label="Mother" value={display(profile.guardians.mother_name)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="git-branch-outline" label="Guardian Relation" value={display(profile.guardians.guardian_relation)} colors={colors} />
          <Divider colors={colors} />
          <ReadOnlyRow icon="call-outline" label="Emergency Contact" value={display(profile.guardians.emergency_contact)} colors={colors} />
        </View>

        <View
          style={[
            styles.note,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.noteText, { color: colors.muted }]}>
            Ward information is managed by the university. Parents can view
            this information but cannot edit it from the portal.
          </Text>
        </View>

        <View style={styles.bottomSpace} />
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
  colors: any;
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

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.infoRow}>
      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor: colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={colors.primary}
        />
      </View>

      <View style={styles.infoContent}>
        <Text
          style={[
            styles.infoLabel,
            { color: colors.subtle },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            { color: colors.text },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function ReadOnlyRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.infoRow}>
      <View
        style={[
          styles.infoIcon,
          {
            backgroundColor: colors.cardSoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={colors.primary}
        />
      </View>

      <View style={styles.infoContent}>
        <Text
          style={[
            styles.infoLabel,
            { color: colors.subtle },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            { color: colors.text },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
    fontWeight: '800',
  },

  errorText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },

  retryButton: {
    marginTop: 22,
    paddingHorizontal: 24,
    height: 46,
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
    paddingBottom: 30,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
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

  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 4,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
  },

  readOnlyBadge: {
    minHeight: 34,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 8,
  },

  readOnlyText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  wardDropdown: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  wardDropdownIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  wardDropdownBody: {
    flex: 1,
    marginLeft: 11,
    minWidth: 0,
  },

  wardDropdownLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 3,
  },

  wardDropdownName: {
    fontSize: 13,
    fontWeight: '900',
  },

  wardDropdownMeta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },

  changeWardButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.58)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '72%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
  },

  modalSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  wardOptions: {
    gap: 10,
    paddingBottom: 4,
  },

  wardOption: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  wardOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  wardOptionBody: {
    flex: 1,
    marginLeft: 11,
    minWidth: 0,
  },

  wardOptionName: {
    fontSize: 13,
    fontWeight: '900',
  },

  wardOptionMeta: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  wardSpacing: {
    height: 18,
  },

  identityCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 26,
  },

  identityBanner: {
    height: 72,
  },

  identityBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingTop: 0,
  },

  avatar: {
    width: 78,
    height: 78,
    borderRadius: 22,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -38,
  },

  avatarText: {
    fontSize: 30,
    fontWeight: '900',
  },

  identityInfo: {
    flex: 1,
    marginLeft: 14,
    paddingTop: 12,
  },

  name: {
    fontSize: 20,
    fontWeight: '900',
  },

  course: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },

  email: {
    fontSize: 12,
    marginTop: 4,
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
    marginBottom: 24,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  infoContent: {
    flex: 1,
    marginLeft: 12,
  },

  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginLeft: 68,
  },


  semester: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },

  note: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
  },

  noteText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
  },

  bottomSpace: {
    height: 20,
  },
});