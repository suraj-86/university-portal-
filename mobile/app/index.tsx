import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, Notice, T } from '@/components/ui';
import { errorMessage } from '@/services/api';
import { BRAND } from '@/constants/theme';

const logo = require('@/assets/images/bbau-icon.png');

export default function Login() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user, ready, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [slow, setSlow] = useState(false);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.primary} /></View>;
  }
  if (user) {
    if (user.role === 'admin') {
      // Admin is web-only; sign the stored session out instead of looping.
    } else if (user.must_change_password) {
      return <Redirect href="/change-password" />;
    } else {
      return <Redirect href={`/${user.role}` as any} />;
    }
  }

  const submit = async () => {
    if (busy) return;
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setError('');
    setBusy(true);
    const timer = setTimeout(() => setSlow(true), 6000);
    try {
      const u = await login(username, password);
      if (u.role === 'admin') { await logout(); setError('The administrator portal is available on the website only.'); }
    } catch (e: any) {
      setError(e?.response?.status === 401 ? 'Invalid username or password.' : errorMessage(e, 'Could not sign in.'));
    } finally {
      clearTimeout(timer);
      setSlow(false);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.header }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: insets.top + 36, paddingBottom: 30, alignItems: 'center', paddingHorizontal: 24 }}>
          <Image source={logo} style={{ width: 84, height: 84, borderRadius: 22, backgroundColor: '#fff' }} />
          <Text style={{ marginTop: 16, color: c.headerText, fontSize: 17, fontWeight: '700', textAlign: 'center', letterSpacing: 0.4 }}>BABASAHEB BHIMRAO{'\n'}AMBEDKAR UNIVERSITY</Text>
          <Text style={{ marginTop: 4, color: c.accent, fontSize: 12, fontWeight: '700' }}>{BRAND.sub}</Text>
          <Text style={{ marginTop: 8, color: c.accent, fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>{BRAND.campus}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: c.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: insets.bottom + 24, gap: 16 }}>
          <View>
            <T v="label" style={{ color: c.primary }}>Welcome back</T>
            <T v="title">Sign in to continue</T>
            <T v="muted" style={{ marginTop: 2 }}>Use the credentials provided by your university.</T>
          </View>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" placeholder="e.g. AC999/99 or FAC999" editable={!busy} returnKeyType="next" />
          <View style={{ gap: 6 }}>
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry={!show} autoCapitalize="none" autoComplete="password" placeholder="••••••••" editable={!busy} returnKeyType="go" onSubmitEditing={submit} />
            <Pressable onPress={() => setShow((s) => !s)} style={{ alignSelf: 'flex-end', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={16} color={c.muted} />
              <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>{show ? 'Hide' : 'Show'} password</Text>
            </Pressable>
          </View>
          <Button label={busy ? 'Signing in…' : 'Sign In'} onPress={submit} loading={busy} />
          {slow ? <Notice tone="info">The server may be waking from sleep. This can take up to a minute the first time. Please keep the app open.</Notice> : null}
          <T v="small" style={{ textAlign: 'center' }}>Forgot your password? Please contact the university office to have it reset.</T>
          <T v="small" style={{ textAlign: 'center', color: c.faint }}>Authorized university users only</T>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
