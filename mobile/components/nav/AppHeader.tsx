import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Text } from '@/components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useInbox } from '@/context/InboxContext';

const logo = require('@/assets/images/bbau-icon.png');

function IconButton({ name, badge, onPress, label }: { name: keyof typeof Ionicons.glyphMap; badge?: number; onPress: () => void; label: string }) {
  const { c } = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface + 'cc', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={20} color={c.headerText} />
      {badge ? (
        <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.header }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function AppHeader({ title, base }: { title: string; base: string }) {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, messages } = useInbox();
  return (
    <View style={{ backgroundColor: c.header, paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <Image source={logo} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff' }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.headerText, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{title}</Text>
        <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }} numberOfLines={1}>BBAU · SATELLITE CAMPUS AMETHI</Text>
      </View>
      <IconButton name="notifications-outline" badge={notifications} label="Notifications" onPress={() => router.navigate(`${base}/notifications` as any)} />
      <IconButton name="chatbubble-ellipses-outline" badge={messages} label="Messages" onPress={() => router.navigate(`${base}/messages` as any)} />
    </View>
  );
}
