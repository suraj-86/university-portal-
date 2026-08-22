import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';

function AppNavigation() {
  const { isDark } = useAppTheme();

  return (
    <NavigationThemeProvider
      value={isDark ? DarkTheme : DefaultTheme}
    >
      <Stack>
        {/* Login */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        {/* Student */}
        <Stack.Screen
          name="student"
          options={{
            headerShown: false,
          }}
        />

        {/* Teacher */}
        <Stack.Screen
          name="teacher"
          options={{
            headerShown: false,
          }}
        />

        {/* Parent */}
        <Stack.Screen
          name="parent"
          options={{
            headerShown: false,
          }}
        />

        {/* Existing modal */}
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Modal',
          }}
        />
      </Stack>

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppNavigation />
    </ThemeProvider>
  );
}