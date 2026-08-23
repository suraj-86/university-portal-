import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import api from '../../services/api';
import {
  getItem,
  removeItem,
  setItem,
} from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

type User = {
  id: number | string;
  username?: string;
  full_name?: string;
  role?: string;
};

type Colors = {
  background: string;
  card: string;
  secondary: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  primary: string;
  primarySoft: string;
  success: string;
  danger: string;
  dangerSoft: string;
};

type Message = {
  text: string;
  type: 'success' | 'error' | '';
};

export default function TeacherSettings() {
  const { isDark, toggleTheme } = useAppTheme();

  const colors: Colors = isDark
    ? {
        background: '#050817',
        card: '#101525',
        secondary: '#151D31',
        border: '#202A42',
        text: '#F8FAFC',
        muted: '#94A3B8',
        subtle: '#66728B',
        primary: '#1764FF',
        primarySoft: '#172554',
        success: '#18D7A0',
        danger: '#EF4444',
        dangerSoft: '#3B1111',
      }
    : {
        background: '#F8FAFC',
        card: '#FFFFFF',
        secondary: '#F1F5F9',
        border: '#E2E8F0',
        text: '#0F172A',
        muted: '#64748B',
        subtle: '#94A3B8',
        primary: '#1764FF',
        primarySoft: '#EFF6FF',
        success: '#10B981',
        danger: '#DC2626',
        dangerSoft: '#FEF2F2',
      };

  const [user, setUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<Message>({
    text: '',
    type: '',
  });

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

  const [passwordMessage, setPasswordMessage] =
    useState<Message>({
      text: '',
      type: '',
    });

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /*
   * Load the authenticated teacher from local storage.
   *
   * This matches the existing mobile authentication flow,
   * which stores authUser after login.
   */
  const loadSettings = async () => {
    try {
      setLoading(true);

      const storedUser = await getItem('authUser');

      if (!storedUser) {
        throw new Error(
          'Your session could not be restored. Please sign in again.'
        );
      }

      const parsedUser = JSON.parse(storedUser);

      if (!parsedUser?.id) {
        throw new Error(
          'Teacher account information is unavailable.'
        );
      }

      setUser(parsedUser);
      setUsername(parsedUser.username || '');

      const storedNotifications =
        await getItem('teacherNotificationsEnabled');

      if (storedNotifications !== null) {
        setNotificationsEnabled(
          storedNotifications === 'true'
        );
      }
    } catch (error: any) {
      console.error(
        'TEACHER SETTINGS LOAD ERROR:',
        error?.message || error
      );

      setUsernameMessage({
        text:
          error?.message ||
          'Unable to load your account settings.',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    loadSettings();
  };

  /*
   * Username update
   *
   * This uses the same endpoint as the web TeacherSettings page:
   * PUT /users/:id/change-username
   */
  const handleUsernameSubmit = async () => {
    if (!user?.id) {
      setUsernameMessage({
        text: 'Unable to identify your account.',
        type: 'error',
      });
      return;
    }

    const nextUsername = username.trim();

    if (!nextUsername) {
      setUsernameMessage({
        text: 'Username cannot be empty.',
        type: 'error',
      });
      return;
    }

    if (nextUsername === String(user.username || '')) {
      return;
    }

    try {
      setSavingUsername(true);

      setUsernameMessage({
        text: '',
        type: '',
      });

      const response = await api.put(
        `/users/${user.id}/change-username`,
        {
          newUsername: nextUsername,
        }
      );

      const updatedUser = {
        ...user,
        username: nextUsername,
      };

      await setItem(
        'authUser',
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
      setUsername(nextUsername);

      setUsernameMessage({
        text:
          response.data?.message ||
          'Username updated successfully.',
        type: 'success',
      });
    } catch (error: any) {
      console.error(
        'TEACHER USERNAME UPDATE ERROR:',
        error?.response?.data ||
          error?.message ||
          error
      );

      setUsernameMessage({
        text:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Failed to update username.',
        type: 'error',
      });
    } finally {
      setSavingUsername(false);
    }
  };

  /*
   * Notification preference is local to this device.
   */
  const handleNotificationToggle = async (
    value: boolean
  ) => {
    setNotificationsEnabled(value);

    try {
      await setItem(
        'teacherNotificationsEnabled',
        String(value)
      );
    } catch (error) {
      console.error(
        'TEACHER NOTIFICATION PREFERENCE ERROR:',
        error
      );
    }
  };

  /*
   * Password update
   *
   * This matches the web TeacherSettings implementation:
   * PUT /users/:id/change-password
   */
  const handleChangePassword = async () => {
    setPasswordMessage({
      text: '',
      type: '',
    });

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordMessage({
        text: 'Please fill in all password fields.',
        type: 'error',
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        text:
          'New password must be at least 8 characters.',
        type: 'error',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        text: 'New passwords do not match.',
        type: 'error',
      });
      return;
    }

    if (!user?.id) {
      setPasswordMessage({
        text: 'Unable to identify your account.',
        type: 'error',
      });
      return;
    }

    try {
      setChangingPassword(true);

      const response = await api.put(
        `/users/${user.id}/change-password`,
        {
          currentPassword,
          newPassword,
        }
      );

      setPasswordMessage({
        text:
          response.data?.message ||
          'Password successfully updated!',
        type: 'success',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error(
        'TEACHER PASSWORD UPDATE ERROR:',
        error?.response?.data ||
          error?.message ||
          error
      );

      setPasswordMessage({
        text:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Failed to update password.',
        type: 'error',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  /*
   * Logout
   *
   * The teacher drawer already uses local auth cleanup,
   * so we keep the same authentication flow here.
   */
  const performLogout = async () => {
    try {
      setLoggingOut(true);

      try {
        await api.post('/logout');
      } catch (error) {
        /*
         * Server logout failure should not prevent local
         * session cleanup.
         */
        console.log(
          'Server logout request failed:',
          error
        );
      }

      await removeItem('authToken');
      await removeItem('authUser');

      setShowLogoutModal(false);

      router.replace('/');
    } catch (error) {
      console.error(
        'TEACHER LOGOUT ERROR:',
        error
      );

      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: colors.background,
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
            {
              color: colors.muted,
            },
          ]}
        >
          Loading settings...
        </Text>
      </View>
    );
  }

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* PAGE HEADER */}

        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            Settings
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.muted,
              },
            ]}
          >
            Manage your account, security and preferences.
          </Text>
        </View>

        {/* ACCOUNT */}

        <SectionHeader
          title="Account"
          subtitle="Manage your teacher account"
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
          {/* ACCOUNT IDENTITY */}

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

            <View style={styles.flexContent}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Teacher Account
              </Text>

              <Text
                style={[
                  styles.rowDescription,
                  {
                    color: colors.muted,
                  },
                ]}
              >
                {user?.full_name ||
                  user?.username ||
                  'Teacher'}
              </Text>
            </View>

            <View
              style={[
                styles.secureBadge,
                {
                  backgroundColor: isDark
                    ? '#063B34'
                    : '#ECFDF5',
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={colors.success}
              />
            </View>
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor: colors.border,
              },
            ]}
          />

          {/* USERNAME */}

          <View style={styles.formSection}>
            <View style={styles.formHeading}>
              <View
                style={[
                  styles.smallIconBox,
                  {
                    backgroundColor:
                      colors.primarySoft,
                  },
                ]}
              >
                <Ionicons
                  name="at-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View style={styles.flexContent}>
                <Text
                  style={[
                    styles.rowTitle,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Change Username
                </Text>

                <Text
                  style={[
                    styles.rowDescription,
                    {
                      color: colors.muted,
                    },
                  ]}
                >
                  Update the username you use to log
                  into the portal.
                </Text>
              </View>
            </View>

            {usernameMessage.text ? (
              <MessageBox
                message={usernameMessage}
                colors={colors}
              />
            ) : null}

            <Text
              style={[
                styles.inputLabel,
                {
                  color: colors.muted,
                },
              ]}
            >
              LOGIN USERNAME
            </Text>

            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={colors.subtle}
              autoCapitalize="none"
              autoCorrect={false}
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

            <Pressable
              onPress={handleUsernameSubmit}
              disabled={
                savingUsername ||
                !username.trim() ||
                username.trim() ===
                  String(user?.username || '')
              }
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor:
                    colors.primary,
                  opacity:
                    savingUsername ||
                    !username.trim() ||
                    username.trim() ===
                      String(user?.username || '')
                      ? 0.55
                      : 1,
                },
                pressed && styles.pressed,
              ]}
            >
              {savingUsername ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="save-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text style={styles.primaryButtonText}>
                    Update Username
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* PREFERENCES */}

        <SectionHeader
          title="Preferences"
          subtitle="Customize your mobile experience"
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
          {/* NOTIFICATIONS */}

          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            description="Receive important university updates."
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
              styles.divider,
              {
                backgroundColor: colors.border,
              },
            ]}
          />

          {/* APPEARANCE */}

          <SettingRow
            icon={
              isDark
                ? 'moon-outline'
                : 'sunny-outline'
            }
            title={
              isDark
                ? 'Dark Mode'
                : 'Appearance'
            }
            description={
              isDark
                ? 'Use the dark appearance.'
                : 'Use the light appearance.'
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

          <View
            style={[
              styles.preferenceInfo,
              {
                backgroundColor:
                  colors.secondary,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={colors.primary}
            />

            <Text
              style={[
                styles.preferenceInfoText,
                {
                  color: colors.muted,
                },
              ]}
            >
              Notification preferences are saved
              locally on this device.
            </Text>
          </View>
        </View>

        {/* SECURITY */}

        <SectionHeader
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
            onPress={() => {
              setShowPasswordForm(
                (current) => !current
              );

              setPasswordMessage({
                text: '',
                type: '',
              });
            }}
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.pressed,
            ]}
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

            <View style={styles.flexContent}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Change Password
              </Text>

              <Text
                style={[
                  styles.rowDescription,
                  {
                    color: colors.muted,
                  },
                ]}
              >
                Update your account password.
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

          {showPasswordForm ? (
            <View
              style={[
                styles.passwordForm,
                {
                  borderTopColor:
                    colors.border,
                },
              ]}
            >
              {passwordMessage.text ? (
                <MessageBox
                  message={passwordMessage}
                  colors={colors}
                />
              ) : null}

              <PasswordField
                label="CURRENT PASSWORD"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                colors={colors}
              />

              <PasswordField
                label="NEW PASSWORD"
                value={newPassword}
                onChangeText={setNewPassword}
                colors={colors}
              />

              <PasswordField
                label="CONFIRM NEW PASSWORD"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                colors={colors}
              />

              <Text
                style={[
                  styles.passwordHint,
                  {
                    color: colors.muted,
                  },
                ]}
              >
                Password must contain at least 8
                characters.
              </Text>

              <Pressable
                onPress={handleChangePassword}
                disabled={changingPassword}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor:
                      colors.primary,
                    opacity: changingPassword
                      ? 0.65
                      : 1,
                  },
                  pressed && styles.pressed,
                ]}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Update Password
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* SESSION */}

        <SectionHeader
          title="Session"
          subtitle="Manage your current portal session"
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
                name="shield-checkmark-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <View style={styles.flexContent}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: colors.text,
                  },
                ]}
              >
                Institutional Access
              </Text>

              <Text
                style={[
                  styles.rowDescription,
                  {
                    color: colors.muted,
                  },
                ]}
              >
                Your teacher account is protected by
                institutional authentication.
              </Text>
            </View>
          </View>
        </View>

        {/* LOGOUT */}

        <Pressable
          onPress={() =>
            setShowLogoutModal(true)
          }
          disabled={loggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor:
                colors.dangerSoft,
              borderColor: isDark
                ? '#4C1D24'
                : '#FECACA',
            },
            pressed && styles.pressed,
          ]}
        >
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
        </Pressable>

        {/* FOOTER */}

        <View style={styles.footer}>
          <View style={styles.statusDot} />

          <Text
            style={[
              styles.footerText,
              {
                color: colors.muted,
              },
            ]}
          >
            Secure institutional access
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* LOGOUT CONFIRMATION */}

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loggingOut) {
            setShowLogoutModal(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.logoutModal,
              {
                backgroundColor: colors.card,
              },
            ]}
          >
            <View
              style={[
                styles.deleteIcon,
                {
                  backgroundColor:
                    colors.dangerSoft,
                },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={25}
                color={colors.danger}
              />
            </View>

            <Text
              style={[
                styles.modalTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Logout?
            </Text>

            <Text
              style={[
                styles.modalDescription,
                {
                  color: colors.muted,
                },
              ]}
            >
              Are you sure you want to logout from
              the teacher portal?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() =>
                  setShowLogoutModal(false)
                }
                disabled={loggingOut}
                style={[
                  styles.modalCancelButton,
                  {
                    backgroundColor:
                      colors.secondary,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={performLogout}
                disabled={loggingOut}
                style={[
                  styles.modalDeleteButton,
                  {
                    backgroundColor:
                      colors.danger,
                  },
                ]}
              >
                {loggingOut ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalDeleteText
                      }
                    >
                      Logout
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* SECTION HEADER                                                             */
/* -------------------------------------------------------------------------- */

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
          {
            color: colors.text,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.sectionSubtitle,
          {
            color: colors.muted,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* SETTING ROW                                                                */
/* -------------------------------------------------------------------------- */

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
  colors: Colors;
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

      <View style={styles.flexContent}>
        <Text
          style={[
            styles.rowTitle,
            {
              color: colors.text,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.rowDescription,
            {
              color: colors.muted,
            },
          ]}
        >
          {description}
        </Text>
      </View>

      {children}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* PASSWORD FIELD                                                             */
/* -------------------------------------------------------------------------- */

function PasswordField({
  label,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: Colors;
}) {
  return (
    <View style={styles.inputContainer}>
      <Text
        style={[
          styles.inputLabel,
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
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Enter password"
        placeholderTextColor={colors.subtle}
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

/* -------------------------------------------------------------------------- */
/* MESSAGE BOX                                                                */
/* -------------------------------------------------------------------------- */

function MessageBox({
  message,
  colors,
}: {
  message: Message;
  colors: Colors;
}) {
  const isError = message.type === 'error';

  return (
    <View
      style={[
        styles.messageBox,
        {
          backgroundColor: isError
            ? colors.dangerSoft
            : isDarkSuccessBackground(colors),
          borderColor: isError
            ? isDarkBorder(colors)
            : colors.success,
        },
      ]}
    >
      <Ionicons
        name={
          isError
            ? 'alert-circle-outline'
            : 'checkmark-circle-outline'
        }
        size={18}
        color={
          isError
            ? colors.danger
            : colors.success
        }
      />

      <Text
        style={[
          styles.messageText,
          {
            color: isError
              ? colors.danger
              : colors.success,
          },
        ]}
      >
        {message.text}
      </Text>
    </View>
  );
}

function isDarkSuccessBackground(
  colors: Colors
) {
  return colors.background === '#050817'
    ? '#063B34'
    : '#ECFDF5';
}

function isDarkBorder(colors: Colors) {
  return colors.background === '#050817'
    ? '#6B1F2A'
    : '#FECACA';
}

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },

  header: {
    marginBottom: 22,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 9,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },

  card: {
    borderWidth: 1,
    borderRadius: 17,
    marginBottom: 22,
    overflow: 'hidden',
  },

  accountRow: {
    minHeight: 78,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingRow: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionRow: {
    minHeight: 78,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  flexContent: {
    flex: 1,
    paddingRight: 10,
  },

  iconBox: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  smallIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  secureBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formSection: {
    padding: 15,
  },

  formHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
  },

  rowDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  divider: {
    height: 1,
  },

  inputContainer: {
    marginBottom: 13,
  },

  inputLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  input: {
    height: 49,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 13,
    fontSize: 13,
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 3,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  messageBox: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },

  messageText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },

  preferenceInfo: {
    marginHorizontal: 15,
    marginBottom: 14,
    borderRadius: 11,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },

  preferenceInfoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },

  passwordForm: {
    borderTopWidth: 1,
    padding: 15,
  },

  passwordHint: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: -3,
    marginBottom: 13,
  },

  logoutButton: {
    minHeight: 53,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 1,
  },

  logoutText: {
    fontSize: 14,
    fontWeight: '900',
  },

  footer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 7,
  },

  footerText: {
    fontSize: 9,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.78,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  logoutModal: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 20,
    padding: 20,
  },

  deleteIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },

  modalDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 20,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 9,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelText: {
    fontSize: 13,
    fontWeight: '800',
  },

  modalDeleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  modalDeleteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});