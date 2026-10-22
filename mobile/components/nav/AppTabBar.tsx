import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useInbox } from '@/context/InboxContext';
import { GROUPS, NavItem } from '@/lib/nav';

const BAR_H = 64;

// Bottom bar with the four main pages plus "Menu". Drag the bar upward (or tap Menu) to open a panel with every
// page, a Home button and Logout; drag it down, tap the dimmed area or pick a page to close it again.
export default function AppTabBar({ state, navigation, items }: BottomTabBarProps & { items: NavItem[] }) {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const inbox = useInbox();
  const [shown, setShown] = useState(false);

  const winH = Dimensions.get('window').height;
  const sheetH = Math.min(winH * 0.8, 700);
  const open = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const openRef = useRef(false);

  const animate = useCallback((to: 0 | 1) => {
    openRef.current = to === 1;
    if (to === 1) setShown(true);
    Animated.spring(open, { toValue: to, useNativeDriver: true, bounciness: 3, speed: 16 }).start(() => { if (to === 0) setShown(false); });
  }, [open]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { setShown(true); },
    onPanResponderMove: (_, g) => {
      const base = openRef.current ? 1 : 0;
      open.setValue(Math.max(0, Math.min(1, base - g.dy / sheetH)));
    },
    onPanResponderRelease: (_, g) => {
      const base = openRef.current ? 1 : 0;
      const v = base - g.dy / sheetH;
      animate(g.vy < -0.5 ? 1 : g.vy > 0.5 ? 0 : v > 0.4 ? 1 : 0);
    },
  }), [open, sheetH, animate]);

  useEffect(() => () => open.stopAnimation(), [open]);

  const active = state.routes[state.index]?.name;
  const primary = items.filter((i) => i.primary);
  const go = (name: string) => {
    animate(0);
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const focused = state.routes[state.index]?.name === name;
    if (!focused) navigation.navigate(route.name as never);
  };

  const badgeFor = (name: string) => (name === 'notices' ? inbox.notices : name === 'announcements' ? inbox.announcements : name === 'messages' ? inbox.messages : name === 'notifications' ? inbox.notifications : 0);
  const moreBadge = inbox.notices + inbox.announcements + inbox.messages + inbox.notifications;
  const bottomPad = Math.max(insets.bottom, 8);
  const translateY = open.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] });
  const backdrop = open.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  return (
    <>
      {shown && (
        <Pressable onPress={() => animate(0)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <Animated.View style={{ flex: 1, backgroundColor: '#050b17', opacity: backdrop }} />
        </Pressable>
      )}
      <Animated.View
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sheetH + BAR_H + bottomPad, transform: [{ translateY }], ...({ userSelect: 'none' } as object), backgroundColor: c.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: c.border, elevation: 16, shadowColor: c.shadow, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: -4 } }}
      >
        <View {...pan.panHandlers}>
          <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 6 }}>
            <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: c.border }} />
          </View>
          {/* collapsed bar */}
          <View style={{ height: BAR_H - 19, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
            {primary.map((it) => {
              const on = active === it.name;
              return (
                <Pressable key={it.name} onPress={() => go(it.name)} accessibilityRole="button" accessibilityLabel={it.title} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 }}>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 3, borderRadius: 14, backgroundColor: on ? c.accentSoft : 'transparent' }}>
                    <Ionicons name={on ? (it.icon.replace('-outline', '') as any) : it.icon} size={22} color={on ? c.accent : c.muted} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: on ? c.accent : c.muted }} numberOfLines={1}>{it.title}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => animate(openRef.current ? 0 : 1)} accessibilityRole="button" accessibilityLabel="Menu" style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 3, borderRadius: 14 }}>
                <Ionicons name="menu-outline" size={22} color={c.muted} />
                {moreBadge > 0 && <View style={{ position: 'absolute', top: 0, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger }} />}
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: c.muted }}>Menu</Text>
            </Pressable>
          </View>
          <View style={{ height: bottomPad }} />
        </View>

        {/* panel */}
        <View style={{ flex: 1 }}>
          <View {...pan.panHandlers} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>Menu</Text>
            <Pressable onPress={() => go('index')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 }}>
              <Ionicons name="home" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Home</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }}>
            {[...GROUPS, { title: 'More', names: items.map((i) => i.name).filter((n) => n !== 'index' && !GROUPS.some((g) => g.names.includes(n))) }].map((g) => {
              const list = g.names.map((n) => items.find((i) => i.name === n)).filter(Boolean) as NavItem[];
              if (list.length === 0) return null;
              return (
                <View key={g.title} style={{ gap: 6 }}>
                  <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 4 }}>{g.title}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                    {list.map((it) => {
                      const on = active === it.name;
                      const b = badgeFor(it.name);
                      return (
                        <Pressable key={it.name} onPress={() => go(it.name)} accessibilityRole="button" style={{ width: '33.33%', padding: 4 }}>
                          <View style={{ alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, backgroundColor: on ? c.accentSoft : c.surfaceAlt, minHeight: 72, justifyContent: 'center' }}>
                            <View>
                              <Ionicons name={it.icon} size={22} color={on ? c.accent : c.primary} />
                              {b > 0 && (
                                <View style={{ position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{b > 99 ? '99+' : b}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ color: c.text, fontSize: 11, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>{it.title}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <Pressable onPress={() => { animate(0); logout(); }} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: c.dangerSoft }}>
              <Ionicons name="log-out-outline" size={20} color={c.danger} />
              <Text style={{ color: c.danger, fontSize: 13, fontWeight: '700' }}>Logout</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Animated.View>
    </>
  );
}
