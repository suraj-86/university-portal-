import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { errorMessage } from '@/services/api';
import { useAppTheme } from '@/context/ThemeContext';
import { Button, Card, Field, Notice, T } from '@/components/ui';

export const MIN_PASSWORD = 8;

// Shared by the forced "choose a new password" screen and Settings.
export default function ChangePasswordForm({ userId, onDone, forced }: { userId: number; onDone: () => void; forced?: boolean }) {
  const { c } = useAppTheme();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  const long = next.length >= MIN_PASSWORD;
  const match = next.length > 0 && next === again;
  const differs = next.length > 0 && next !== cur;

  const rule = (ok: boolean, text: string) => (
    <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? c.success : c.faint} />
      <T v="small" style={{ color: ok ? c.success : c.muted }}>{text}</T>
    </View>
  );

  const save = async () => {
    if (!cur || !long || !match || !differs) { setMsg({ tone: 'danger', text: 'Please meet every rule below first.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await api.put(`/users/${userId}/change-password`, { currentPassword: cur, newPassword: next });
      setCur(''); setNext(''); setAgain('');
      setMsg({ tone: 'success', text: 'Password changed.' });
      onDone();
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e, 'Could not change the password.') });
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <View style={{ gap: 14 }}>
        {forced ? <Notice tone="warn">Your password was reset by the university office. Choose a new one to continue.</Notice> : null}
        {msg ? <Notice tone={msg.tone === 'danger' ? 'danger' : 'success'}>{msg.text}</Notice> : null}
        <Field label={forced ? 'Temporary password' : 'Current password'} value={cur} onChangeText={setCur} secureTextEntry autoCapitalize="none" />
        <Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" />
        <Field label="Repeat new password" value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" />
        <View style={{ gap: 6 }}>
          {rule(long, `At least ${MIN_PASSWORD} characters`)}
          {rule(differs, 'Different from the current password')}
          {rule(match, 'Both new passwords match')}
        </View>
        <Button label="Save password" onPress={save} loading={busy} />
      </View>
    </Card>
  );
}
