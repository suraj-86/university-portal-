import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import ChangePasswordForm from '@/components/ChangePassword';
import { Button, T } from '@/components/ui';

export default function ForcedChangePassword() {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, ready, passwordChanged, logout } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/" />;
  if (!user.must_change_password) return <Redirect href={`/${user.role}` as any} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 28, gap: 16 }} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={{ color: c.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>ONE MORE STEP</Text>
        <T v="title">Choose a new password</T>
      </View>
      <ChangePasswordForm userId={user.id} forced onDone={() => { passwordChanged(); router.replace(`/${user.role}` as any); }} />
      <Button label="Sign out instead" variant="soft" onPress={() => { logout(); router.replace('/'); }} />
    </ScrollView>
  );
}
