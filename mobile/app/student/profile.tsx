import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

type EditableProfile = {
  contact: string;
  blood_group: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  father_name: string;
  emergency_contact: string;
  guardian_relation: string;
};

export default function StudentProfile() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<EditableProfile>({
    contact: '',
    blood_group: '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    father_name: '',
    emergency_contact: '',
    guardian_relation: '',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

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
    success: '#18D7A0',
    danger: '#EF4444',
    input: isDark ? '#0B1020' : '#F8FAFC',
  };

  const loadProfile = useCallback(async () => {
    try {
      setError('');
      setSaveMessage('');

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
      const data: ProfileData = response.data;

      setProfile(data);

      setForm({
        contact: data.personal?.contact || '',
        blood_group: data.personal?.blood_group || '',
        address: data.personal?.address || '',
        city: data.personal?.city || '',
        state: data.personal?.state || '',
        pin_code: data.personal?.pin_code || '',
        father_name: data.guardians?.father_name || '',
        emergency_contact: data.guardians?.emergency_contact || '',
        guardian_relation: data.guardians?.guardian_relation || '',
      });
    } catch (err: any) {
      console.error(
        'STUDENT PROFILE ERROR:',
        err?.response?.data || err?.message
      );

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load your profile.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const updateField = (
    field: keyof EditableProfile,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const cancelEditing = () => {
    if (!profile) return;

    setForm({
      contact: profile.personal?.contact || '',
      blood_group: profile.personal?.blood_group || '',
      address: profile.personal?.address || '',
      city: profile.personal?.city || '',
      state: profile.personal?.state || '',
      pin_code: profile.personal?.pin_code || '',
      father_name: profile.guardians?.father_name || '',
      emergency_contact: profile.guardians?.emergency_contact || '',
      guardian_relation: profile.guardians?.guardian_relation || '',
    });

    setSaveMessage('');
    setEditing(false);
  };

  const handleSave = async () => {
    if (!form.contact.trim()) {
      setSaveMessage('Contact number is required.');
      return;
    }

    try {
      setSaving(true);
      setSaveMessage('');

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

      await api.put(`/student/${userId}/profile`, {
        contact: form.contact.trim(),
        blood_group: form.blood_group.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pin_code: form.pin_code.trim(),
        father_name: form.father_name.trim(),
        emergency_contact: form.emergency_contact.trim(),
        guardian_relation: form.guardian_relation.trim(),
      });

      setProfile((current) => {
        if (!current) return current;

        return {
          ...current,
          personal: {
            ...current.personal,
            contact: form.contact,
            blood_group: form.blood_group,
            address: form.address,
            city: form.city,
            state: form.state,
            pin_code: form.pin_code,
          },
          guardians: {
            ...current.guardians,
            father_name: form.father_name,
            emergency_contact: form.emergency_contact,
            guardian_relation: form.guardian_relation,
          },
        };
      });

      setEditing(false);
      setSaveMessage('Profile updated successfully.');
    } catch (err: any) {
      console.error(
        'PROFILE UPDATE ERROR:',
        err?.response?.data || err?.message
      );

      setSaveMessage(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          Loading your profile...
        </Text>
      </View>
    );
  }

  if (error || !profile) {
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
            name="person-outline"
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
          Profile unavailable
        </Text>

        <Text
          style={[
            styles.errorText,
            { color: colors.muted },
          ]}
        >
          {error || 'We could not load your profile.'}
        </Text>

        <Pressable
          onPress={loadProfile}
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

  const initials =
    profile.personal?.name?.trim()?.charAt(0)?.toUpperCase() || 'S';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
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
                  styles.eyebrow,
                  { color: colors.primary },
                ]}
              >
                UNIVERSITY PORTAL
              </Text>

              <Text
                style={[
                  styles.title,
                  { color: colors.text },
                ]}
              >
                My Profile
              </Text>
            </View>
          </View>

          {!editing ? (
            <Pressable
              onPress={() => {
                setSaveMessage('');
                setEditing(true);
              }}
              style={[
                styles.editButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Save status */}
        {saveMessage ? (
          <View
            style={[
              styles.message,
              {
                backgroundColor: saveMessage.includes('success')
                  ? isDark
                    ? '#052E2B'
                    : '#ECFDF5'
                  : isDark
                    ? '#35101A'
                    : '#FEF2F2',
                borderColor: saveMessage.includes('success')
                  ? isDark
                    ? '#14532D'
                    : '#A7F3D0'
                  : isDark
                    ? '#7F1D1D'
                    : '#FECACA',
              },
            ]}
          >
            <Ionicons
              name={
                saveMessage.includes('success')
                  ? 'checkmark-circle-outline'
                  : 'alert-circle-outline'
              }
              size={19}
              color={
                saveMessage.includes('success')
                  ? colors.success
                  : colors.danger
              }
            />

            <Text
              style={[
                styles.messageText,
                {
                  color: saveMessage.includes('success')
                    ? colors.success
                    : colors.danger,
                },
              ]}
            >
              {saveMessage}
            </Text>
          </View>
        ) : null}

        {/* Identity card */}
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
            style={[
              styles.identityBanner,
              { backgroundColor: colors.primary },
            ]}
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
              <Text
                style={[
                  styles.avatarText,
                  { color: colors.primary },
                ]}
              >
                {initials}
              </Text>
            </View>

            <View style={styles.identityInfo}>
              <Text
                style={[
                  styles.name,
                  { color: colors.text },
                ]}
              >
                {profile.personal.name}
              </Text>

              <Text
                style={[
                  styles.course,
                  { color: colors.primary },
                ]}
              >
                {profile.academic.course || 'Course not available'}
              </Text>

              <Text
                style={[
                  styles.email,
                  { color: colors.muted },
                ]}
              >
                {profile.personal.email || 'Email not available'}
              </Text>
            </View>
          </View>
        </View>

        {/* Academic information */}
        <SectionTitle
          title="Academic Information"
          subtitle="YOUR UNIVERSITY RECORD"
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
          <InfoRow
            icon="id-card-outline"
            label="Roll Number"
            value={profile.academic.roll_no || 'Not available'}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="document-text-outline"
            label="Enrollment Number"
            value={
              profile.academic.enrollment_no || 'Not available'
            }
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="school-outline"
            label="Course"
            value={profile.academic.course || 'Not available'}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="layers-outline"
            label="Semester"
            value={profile.academic.semester || 'Not available'}
            colors={colors}
          />

          <Divider colors={colors} />

          <InfoRow
            icon="calendar-outline"
            label="Batch"
            value={profile.academic.batch || 'Not available'}
            colors={colors}
          />
        </View>

        {/* Personal information */}
        <SectionTitle
          title="Personal Information"
          subtitle={
            editing
              ? 'UPDATE YOUR PERSONAL DETAILS'
              : 'YOUR PERSONAL DETAILS'
          }
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
          <ReadOnlyRow
            icon="person-outline"
            label="Full Name"
            value={profile.personal.name}
            colors={colors}
          />

          <Divider colors={colors} />

          <ReadOnlyRow
            icon="calendar-outline"
            label="Date of Birth"
            value={profile.personal.dob}
            colors={colors}
          />

          <Divider colors={colors} />

          <ReadOnlyRow
            icon="male-female-outline"
            label="Gender"
            value={profile.personal.gender || 'Not available'}
            colors={colors}
          />

          <Divider colors={colors} />

          {editing ? (
            <EditableField
              icon="call-outline"
              label="Contact Number"
              value={form.contact}
              onChangeText={(value) =>
                updateField('contact', value)
              }
              keyboardType="phone-pad"
              colors={colors}
            />
          ) : (
            <ReadOnlyRow
              icon="call-outline"
              label="Contact Number"
              value={
                profile.personal.contact || 'Not available'
              }
              colors={colors}
            />
          )}

          <Divider colors={colors} />

          <ReadOnlyRow
            icon="mail-outline"
            label="Email"
            value={profile.personal.email || 'Not available'}
            colors={colors}
          />

          <Divider colors={colors} />

          {editing ? (
            <EditableField
              icon="water-outline"
              label="Blood Group"
              value={form.blood_group}
              onChangeText={(value) =>
                updateField('blood_group', value)
              }
              colors={colors}
            />
          ) : (
            <ReadOnlyRow
              icon="water-outline"
              label="Blood Group"
              value={
                profile.personal.blood_group || 'Not available'
              }
              colors={colors}
            />
          )}

          <Divider colors={colors} />

          {editing ? (
            <EditableField
              icon="location-outline"
              label="Address"
              value={form.address}
              onChangeText={(value) =>
                updateField('address', value)
              }
              multiline
              colors={colors}
            />
          ) : (
            <ReadOnlyRow
              icon="location-outline"
              label="Address"
              value={profile.personal.address || 'Not available'}
              colors={colors}
            />
          )}

          <Divider colors={colors} />

          {editing ? (
            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <EditableField
                  icon="business-outline"
                  label="City"
                  value={form.city}
                  onChangeText={(value) =>
                    updateField('city', value)
                  }
                  colors={colors}
                />
              </View>

              <View style={styles.column}>
                <EditableField
                  icon="map-outline"
                  label="State"
                  value={form.state}
                  onChangeText={(value) =>
                    updateField('state', value)
                  }
                  colors={colors}
                />
              </View>
            </View>
          ) : (
            <>
              <ReadOnlyRow
                icon="business-outline"
                label="City"
                value={profile.personal.city || 'Not available'}
                colors={colors}
              />

              <Divider colors={colors} />

              <ReadOnlyRow
                icon="map-outline"
                label="State"
                value={profile.personal.state || 'Not available'}
                colors={colors}
              />
            </>
          )}

          <Divider colors={colors} />

          {editing ? (
            <EditableField
              icon="navigate-outline"
              label="PIN Code"
              value={form.pin_code}
              onChangeText={(value) =>
                updateField('pin_code', value)
              }
              keyboardType="number-pad"
              colors={colors}
            />
          ) : (
            <ReadOnlyRow
              icon="navigate-outline"
              label="PIN Code"
              value={profile.personal.pin_code || 'Not available'}
              colors={colors}
            />
          )}
        </View>

        {/* Guardian information */}
        <SectionTitle
          title="Guardian Information"
          subtitle={
            editing
              ? 'UPDATE YOUR GUARDIAN DETAILS'
              : 'YOUR GUARDIAN DETAILS'
          }
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
          {editing ? (
            <EditableField
              icon="person-outline"
              label="Father / Guardian Name"
              value={form.father_name}
              onChangeText={(value) =>
                updateField('father_name', value)
              }
              colors={colors}
            />
          ) : (
            <ReadOnlyRow
              icon="person-outline"
              label="Father / Guardian Name"
              value={
                profile.guardians.father_name || 'Not available'
              }
              colors={colors}
            />
          )}

          <Divider colors={colors} />

          <ReadOnlyRow
            icon="people-outline"
            label="Mother"
            value={
              profile.guardians.mother_name || 'Not available'
            }
            colors={colors}
          />

          <Divider colors={colors} />

          {editing ? (
            <EditableField
              icon="git-branch-outline"
              label="Guardian Relation"
              value={form.guardian_relation}
              onChangeText={(value) =>
                updateField('guardian_relation', value)
              }
              colors={colors}
            />
          ) : (
            <ReadOnlyRow
              icon="git-branch-outline"
              label="Guardian Relation"
              value={
                profile.guardians.guardian_relation ||
                'Not available'
              }
              colors={colors}
            />
          )}

          <Divider colors={colors} />

          {editing ? (
            <EditableField
              icon="call-outline"
              label="Emergency Contact"
              value={form.emergency_contact}
              onChangeText={(value) =>
                updateField('emergency_contact', value)
              }
              keyboardType="phone-pad"
              colors={colors}
            />
          ) : (
            <ReadOnlyRow
              icon="call-outline"
              label="Emergency Contact"
              value={
                profile.guardians.emergency_contact ||
                'Not available'
              }
              colors={colors}
            />
          )}
        </View>

        {/* Edit actions */}
        {editing ? (
          <View style={styles.actions}>
            <Pressable
              onPress={cancelEditing}
              disabled={saving}
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: saving ? 0.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.cancelText,
                  { color: colors.text },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.primary,
                  opacity: saving ? 0.7 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.saveText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </KeyboardAvoidingView>
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

function EditableField({
  icon,
  label,
  value,
  onChangeText,
  keyboardType,
  multiline = false,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: any;
  multiline?: boolean;
  colors: any;
}) {
  return (
    <View style={styles.editField}>
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

      <View style={styles.inputContainer}>
        <Text
          style={[
            styles.infoLabel,
            { color: colors.subtle },
          ]}
        >
          {label}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.subtle}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.input,
              borderColor: colors.border,
              minHeight: multiline ? 70 : undefined,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />
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

  editButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  editButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  message: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  messageText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    fontWeight: '700',
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

  editField: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  inputContainer: {
    flex: 1,
    marginLeft: 12,
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
  },

  twoColumn: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  column: {
    flex: 1,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: -8,
    marginBottom: 20,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontSize: 14,
    fontWeight: '800',
  },

  saveButton: {
    flex: 1.4,
    height: 50,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 20,
  },
});