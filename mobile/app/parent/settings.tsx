import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
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
import { getItem, removeItem, setItem } from '../../services/storage';
import { useAppTheme } from '../../context/ThemeContext';

export default function ParentSettings() {
  const { isDark, toggleTheme } = useAppTheme();

  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = isDark
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
        icon: '#CBD5E1',
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
        icon: '#475569',
        success: '#10B981',
        danger: '#DC2626',
        dangerSoft: '#FEF2F2',
      };

  const loadSettings = async () => {
    try {
      const storedUser = await getItem('authUser');
      if (!storedUser) {
        throw new Error('Your session could not be restored. Please sign in again.');
      }

      const parsedUser = JSON.parse(storedUser);
      if (!parsedUser?.id) {
        throw new Error('Parent account information is unavailable.');
      }

      setUser(parsedUser);
      setUsername(parsedUser.username || '');

      const storedNotifications = await getItem('parentNotificationsEnabled');
      if (storedNotifications !== null) {
        setNotificationsEnabled(storedNotifications === 'true');
      }
    } catch (error: any) {
      Alert.alert(
        'Settings unavailable',
        error?.message || 'Unable to load your account settings.'
      );
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

  const saveUsername = async () => {
    const nextUsername = username.trim();

    if (!user?.id) {
      Alert.alert('Session error', 'Unable to identify your account.');
      return;
    }

    if (!nextUsername) {
      Alert.alert('Invalid username', 'Username cannot be empty.');
      return;
    }

    if (nextUsername === String(user.username || '')) {
      return;
    }

    try {
      setSavingUsername(true);
      const response = await api.put(`/users/${user.id}/change-username`, {
        newUsername: nextUsername,
      });

      const updatedUser = { ...user, username: nextUsername };
      await setItem('authUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setUsername(nextUsername);

      Alert.alert(
        'Username updated',
        response.data?.message || 'Your username has been updated successfully.'
      );
    } catch (error: any) {
      console.error('PARENT USERNAME ERROR:', error?.response?.data || error?.message || error);
      Alert.alert(
        'Update failed',
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Unable to update your username. Please try again.'
      );
    } finally {
      setSavingUsername(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Incomplete form', 'Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Invalid password', 'New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure the new passwords match.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Session error', 'Unable to identify your account.');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await api.put(`/users/${user.id}/change-password`, {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);

      Alert.alert(
        'Password updated',
        response.data?.message || 'Your password has been changed successfully.'
      );
    } catch (error: any) {
      console.error('PARENT PASSWORD ERROR:', error?.response?.data || error?.message || error);
      Alert.alert(
        'Password update failed',
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Unable to change your password. Please try again.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await setItem('parentNotificationsEnabled', String(value));
    } catch (error) {
      console.log('Failed to save parent notification preference:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: performLogout },
    ]);
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);

      try {
        await api.post('/logout');
      } catch (error) {
        console.log('Server logout request failed:', error);
      }

      await removeItem('authToken');
      await removeItem('authUser');
      router.replace('/');
    } catch (error) {
      console.error('Parent logout error:', error);
      Alert.alert('Logout failed', 'Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading account settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Manage your account, security and preferences</Text>
        </View>
      </View>

      <View style={[styles.accountBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.accountIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="person-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.subtle }]}>PARENT ACCOUNT</Text>
          <Text numberOfLines={1} style={[styles.accountUsername, { color: colors.text }]}>{username || 'Parent'}</Text>
          <Text style={[styles.accountMeta, { color: colors.muted }]}>Secure institutional access</Text>
        </View>
        <View style={[styles.secureBadge, { backgroundColor: colors.secondary }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: colors.text }]}>Account</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="person-outline" size={21} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Change Username</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Update the username used to log into the portal.</Text>
          </View>
        </View>

        <Text style={[styles.inputLabel, { color: colors.muted }]}>LOGIN USERNAME</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter username"
          placeholderTextColor={colors.subtle}
          style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
        />

        <Pressable
          onPress={saveUsername}
          disabled={savingUsername || !username.trim() || username.trim() === String(user?.username || '')}
          style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: savingUsername || !username.trim() || username.trim() === String(user?.username || '') ? 0.5 : 1 }]}
        >
          {savingUsername ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
          <Text style={styles.primaryButtonText}>{savingUsername ? 'Saving...' : 'Update Username'}</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionHeading, { color: colors.text }]}>Preferences</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingBody}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Notifications</Text>
            <Text style={[styles.settingSubtitle, { color: colors.muted }]}>Allow app notifications for important updates.</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: isDark ? '#3B2A0A' : '#FFF7ED' }]}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={isDark ? '#FBBF24' : '#F59E0B'} />
          </View>
          <View style={styles.settingBody}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Appearance</Text>
            <Text style={[styles.settingSubtitle, { color: colors.muted }]}>{isDark ? 'Dark mode is enabled.' : 'Light mode is enabled.'}</Text>
          </View>
          <Pressable onPress={toggleTheme} style={[styles.modeButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.modeButtonText, { color: colors.text }]}>{isDark ? 'Light' : 'Dark'}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: colors.text }]}>Security</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="shield-checkmark-outline" size={21} color={colors.icon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Change Password</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Keep your account protected with a strong password.</Text>
          </View>
        </View>

        {!showPasswordForm ? (
          <Pressable
            onPress={() => setShowPasswordForm(true)}
            style={[styles.secondaryButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Ionicons name="key-outline" size={18} color={colors.text} />
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Change Password</Text>
          </Pressable>
        ) : (
          <View style={styles.passwordForm}>
            <PasswordField label="CURRENT PASSWORD" value={currentPassword} onChangeText={setCurrentPassword} colors={colors} />
            <PasswordField label="NEW PASSWORD" value={newPassword} onChangeText={setNewPassword} colors={colors} />
            <PasswordField label="CONFIRM NEW PASSWORD" value={confirmPassword} onChangeText={setConfirmPassword} colors={colors} />

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setShowPasswordForm(false);
                }}
                style={[styles.cancelButton, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={changePassword}
                disabled={changingPassword}
                style={[styles.primaryButton, styles.flexButton, { backgroundColor: colors.primary, opacity: changingPassword ? 0.6 : 1 }]}
              >
                {changingPassword ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
                <Text style={styles.primaryButtonText}>{changingPassword ? 'Updating...' : 'Update Password'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.logoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.logoutIcon, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="log-out-outline" size={21} color={colors.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.logoutTitle, { color: colors.text }]}>Sign out</Text>
          <Text style={[styles.logoutSubtitle, { color: colors.muted }]}>End this session on this device.</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          style={[styles.logoutButton, { borderColor: colors.danger, opacity: loggingOut ? 0.6 : 1 }]}
        >
          {loggingOut ? <ActivityIndicator size="small" color={colors.danger} /> : <Text style={[styles.logoutButtonText, { color: colors.danger }]}>Logout</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: any;
};

function PasswordField({ label, value, onChangeText, colors }: PasswordFieldProps) {
  return (
    <View>
      <Text style={[styles.inputLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="••••••••"
        placeholderTextColor={colors.subtle}
        style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  accountBanner: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  accountIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginBottom: 3 },
  accountUsername: { fontSize: 16, fontWeight: '900' },
  accountMeta: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  secureBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { fontSize: 13, fontWeight: '900', marginBottom: 9, marginLeft: 2, letterSpacing: 0.2 },
  card: { borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 16 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  cardSubtitle: { fontSize: 10, lineHeight: 15, marginTop: 3, fontWeight: '600' },
  inputLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  input: { height: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  primaryButton: { minHeight: 45, borderRadius: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  secondaryButton: { minHeight: 45, borderWidth: 1, borderRadius: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { fontSize: 11, fontWeight: '900' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 60 },
  settingIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingBody: { flex: 1 },
  settingTitle: { fontSize: 13, fontWeight: '900' },
  settingSubtitle: { fontSize: 10, lineHeight: 15, marginTop: 3, fontWeight: '600' },
  divider: { height: 1, marginVertical: 11 },
  modeButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  modeButtonText: { fontSize: 10, fontWeight: '900' },
  passwordForm: { marginTop: 2 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelButton: { minHeight: 45, paddingHorizontal: 15, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 11, fontWeight: '800' },
  flexButton: { flex: 1 },
  logoutCard: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoutTitle: { fontSize: 13, fontWeight: '900' },
  logoutSubtitle: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  logoutButton: { borderWidth: 1, borderRadius: 11, minWidth: 66, height: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  logoutButtonText: { fontSize: 10, fontWeight: '900' },
});