import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from '@/components/AppText';
import Constants from 'expo-constants';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import ChangePasswordForm from '@/components/ChangePassword';
import { Badge, Button, Card, Field, Notice, Screen, Segmented, T } from '@/components/ui';
import api, { errorMessage } from '@/services/api';
import { getItem, setItem } from '@/services/storage';

const ROLE_LABEL: Record<string, string> = { admin: 'Administrator', teacher: 'Teacher', student: 'Student', parent: 'Parent' };

function SectionCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <Card>
      <View style={{ gap: 4, marginBottom: 14 }}>
        <T v="h2">{title}</T>
        <T v="small">{hint}</T>
      </View>
      {children}
    </Card>
  );
}

export default function Settings() {
  const { c, mode, setMode } = useAppTheme();
  const { user, logout } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [savedName, setSavedName] = useState(user?.username || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  if (!user) return null;
  const initial = (user.full_name || user.username || '?').trim().charAt(0).toUpperCase();

  const saveUsername = async () => {
    const next = username.trim();
    if (!next || next === savedName) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.put(`/users/${user.id}/change-username`, { newUsername: next });
      // Keep the saved session in step so the new name is shown after the app restarts.
      try {
        const raw = await getItem('authUser');
        if (raw) await setItem('authUser', JSON.stringify({ ...JSON.parse(raw), username: next }));
      } catch { /* the name is already saved on the server */ }
      setSavedName(next);
      setUsername(next);
      setMsg({ tone: 'success', text: r.data?.message || 'Username updated.' });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e, 'Failed to update username.') });
    } finally { setBusy(false); }
  };

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Do you want to sign out of this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { logout(); } },
    ]);
  };

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>{initial}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{user.full_name || user.username}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={ROLE_LABEL[user.role] || user.role} tone="info" />
              {user.username ? <T v="small">Signed in as {savedName || user.username}</T> : null}
            </View>
          </View>
        </View>
      </Card>

      <SectionCard title="Appearance" hint="Choose how the app looks on this device.">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
        />
      </SectionCard>

      <SectionCard title="Login username" hint="The name you type to sign in. Your name in the app does not change.">
        <View style={{ gap: 12 }}>
          {msg ? <Notice tone={msg.tone === 'danger' ? 'danger' : 'success'}>{msg.text}</Notice> : null}
          <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" />
          <Button label="Save username" onPress={saveUsername} loading={busy} disabled={!username.trim() || username.trim() === savedName} />
        </View>
      </SectionCard>

      <View style={{ gap: 4, marginLeft: 2 }}>
        <T v="h2">Password</T>
        <T v="small">Use something long that you do not use anywhere else.</T>
      </View>
      <ChangePasswordForm userId={user.id} onDone={() => Alert.alert('Password changed', 'Your password has been updated.')} />

      <Card>
        <View style={{ gap: 12 }}>
          <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={confirmLogout} />
          <T v="small" style={{ textAlign: 'center' }}>BBAU Amethi app · version {Constants.expoConfig?.version || '2.0.0'}</T>
        </View>
      </Card>
    </Screen>
  );
}
