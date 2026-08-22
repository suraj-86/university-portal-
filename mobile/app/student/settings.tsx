import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import api from '../../services/api';
import {
  getItem,
  removeItem,
  setItem,
} from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

export default function StudentSettings() {
  const { isDark, toggleTheme } = useAppTheme();

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const [showPasswordForm, setShowPasswordForm] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [changingPassword, setChangingPassword] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

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
        danger: '#EF4444',
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
        danger: '#DC2626',
      };

  React.useEffect(() => {
    loadNotificationPreference();
  }, []);

  const loadNotificationPreference = async () => {
    try {
      const stored =
        await getItem('studentNotificationsEnabled');

      if (stored !== null) {
        setNotificationsEnabled(
          stored === 'true'
        );
      }
    } catch (error) {
      console.log(
        'Notification preference error:',
        error
      );
    }
  };

  const handleNotificationToggle = async (
    value: boolean
  ) => {
    setNotificationsEnabled(value);

    try {
      await setItem(
        'studentNotificationsEnabled',
        String(value)
      );
    } catch (error) {
      console.log(
        'Failed to save notification preference:',
        error
      );
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        'Incomplete form',
        'Please fill in all password fields.'
      );
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(
        'Invalid password',
        'New password must be at least 8 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Please make sure the new passwords match.'
      );
      return;
    }

    try {
      setChangingPassword(true);

      const storedUser = await getItem('authUser');

      if (!storedUser) {
        Alert.alert(
          'Session expired',
          'Please login again.'
        );
        return;
      }

      const user = JSON.parse(storedUser);

      if (!user?.id) {
        Alert.alert(
          'Session error',
          'Unable to identify your account.'
        );
        return;
      }

      const response = await api.put(
        `/users/${user.id}/change-password`,
        {
          currentPassword,
          newPassword,
        }
      );

      Alert.alert(
        'Password updated',
        response.data?.message ||
          'Your password has been changed successfully.'
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error: any) {
      console.log(
        'Change password error:',
        error?.response?.data ||
          error?.message ||
          error
      );

      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Unable to change your password. Please try again.';

      Alert.alert(
        'Password update failed',
        message
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);

      try {
        await api.post('/logout');
      } catch (error) {
        console.log(
          'Server logout request failed:',
          error
        );
      }

      await removeItem('authToken');
      await removeItem('authUser');

      router.replace('/');
    } catch (error) {
      console.log(
        'Logout error:',
        error
      );

      Alert.alert(
        'Logout failed',
        'Please try again.'
      );
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>

        <Text
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          Settings
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: colors.muted },
          ]}
        >
          Manage your account and app preferences.
        </Text>
      </View>

      <SectionTitle
        title="Appearance"
        subtitle="Customize how the App looks"
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
        <SettingRow
          icon={
            isDark
              ? 'moon-outline'
              : 'sunny-outline'
          }
          title={
            isDark
              ? 'Dark Mode'
              : 'Light Mode'
          }
          description={
            isDark
              ? 'Use the dark appearance'
              : 'Use the light appearance'
          }
          colors={colors}
        >
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{
              false: '#CBD5E1',
              true: colors.primary,
            }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>
      </View>

      <SectionTitle
        title="Notifications"
        subtitle="Control your App alerts"
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
        <SettingRow
          icon="notifications-outline"
          title="Notice Alerts"
          description="Receive alerts for university notices"
          colors={colors}
        >
          <Switch
            value={notificationsEnabled}
            onValueChange={
              handleNotificationToggle
            }
            trackColor={{
              false: '#CBD5E1',
              true: colors.primary,
            }}
            thumbColor="#FFFFFF"
          />
        </SettingRow>

        <View
          style={[
            styles.infoBox,
            {
              backgroundColor:
                colors.secondary,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.primary}
          />

          <Text
            style={[
              styles.infoText,
              { color: colors.muted },
            ]}
          >
            Your notification preference is saved on
            this device.
          </Text>
        </View>
      </View>

      <SectionTitle
        title="Security"
        subtitle="Keep your account protected"
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
        <Pressable
          onPress={() =>
            setShowPasswordForm(
              (current) => !current
            )
          }
          style={styles.actionRow}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  colors.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <View style={styles.actionText}>
            <Text
              style={[
                styles.actionTitle,
                { color: colors.text },
              ]}
            >
              Change Password
            </Text>

            <Text
              style={[
                styles.actionDescription,
                { color: colors.muted },
              ]}
            >
              Update your account password
            </Text>
          </View>

          <Ionicons
            name={
              showPasswordForm
                ? 'chevron-up'
                : 'chevron-forward'
            }
            size={20}
            color={colors.muted}
          />
        </Pressable>

        {showPasswordForm && (
          <View
            style={[
              styles.passwordForm,
              {
                borderTopColor:
                  colors.border,
              },
            ]}
          >
            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              colors={colors}
            />

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              colors={colors}
            />

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              colors={colors}
            />

            <Text
              style={[
                styles.passwordHint,
                { color: colors.muted },
              ]}
            >
              Password must contain at least 8
              characters.
            </Text>

            <Pressable
              onPress={handleChangePassword}
              disabled={changingPassword}
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    colors.primary,
                  opacity: changingPassword
                    ? 0.7
                    : 1,
                },
              ]}
            >
              {changingPassword ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.primaryButtonText}
                  >
                    Update Password
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <SectionTitle
        title="Account"
        subtitle="Your current session"
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
        <View style={styles.accountRow}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor:
                  colors.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <View style={styles.actionText}>
            <Text
              style={[
                styles.actionTitle,
                { color: colors.text },
              ]}
            >
              Student Account
            </Text>

            <Text
              style={[
                styles.actionDescription,
                { color: colors.muted },
              ]}
            >
              Your account is protected by
              institutional authentication.
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={handleLogout}
        disabled={loggingOut}
        style={[
          styles.logoutButton,
          {
            backgroundColor: isDark
              ? '#2A1115'
              : '#FEF2F2',
            borderColor: isDark
              ? '#4C1D24'
              : '#FECACA',
          },
        ]}
      >
        {loggingOut ? (
          <ActivityIndicator
            color={colors.danger}
          />
        ) : (
          <>
            <Ionicons
              name="log-out-outline"
              size={21}
              color={colors.danger}
            />

            <Text
              style={[
                styles.logoutText,
                {
                  color: colors.danger,
                },
              ]}
            >
              Logout
            </Text>
          </>
        )}
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.statusDot} />

        <Text
          style={[
            styles.footerText,
            { color: colors.muted },
          ]}
        >
          Secure institutional access
        </Text>
      </View>
    </ScrollView>
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
          { color: colors.muted },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  description,
  colors,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>

      <View style={styles.actionText}>
        <Text
          style={[
            styles.actionTitle,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.actionDescription,
            { color: colors.muted },
          ]}
        >
          {description}
        </Text>
      </View>

      {children}
    </View>
  );
}

function PasswordInput({
  label,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: any;
}) {
  return (
    <View style={styles.inputContainer}>
      <Text
        style={[
          styles.inputLabel,
          { color: colors.muted },
        ]}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            backgroundColor:
              colors.secondary,
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
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 26,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 7,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
  },

  subtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 21,
  },

  sectionHeader: {
    marginBottom: 10,
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 24,
    overflow: 'hidden',
  },

  settingRow: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionRow: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountRow: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  actionText: {
    flex: 1,
    paddingRight: 10,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  actionDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },

  infoBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 8,
  },

  passwordForm: {
    borderTopWidth: 1,
    padding: 16,
  },

  inputContainer: {
    marginBottom: 14,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },

  passwordHint: {
    fontSize: 11,
    marginBottom: 14,
  },

  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  logoutButton: {
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 2,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 25,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 7,
  },

  footerText: {
    fontSize: 10,
  },
});