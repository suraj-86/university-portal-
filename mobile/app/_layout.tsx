import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider as NavTheme } from '@react-navigation/native';

import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';

function Shell() {
  const { c, isDark } = useAppTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  return (
    <NavTheme value={{ ...base, colors: { ...base.colors, background: c.bg, card: c.surface, text: c.text, border: c.border, primary: c.primary } }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavTheme>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!fontsLoaded && !fontError) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
