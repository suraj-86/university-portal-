import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, Palette } from '@/constants/theme';
import { getItem, setItem } from '@/services/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

type Value = { c: Palette; isDark: boolean; mode: ThemeMode; setMode: (m: ThemeMode) => void };

const Ctx = createContext<Value | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getItem('themeMode')
      .then((v: string | null) => { if (v === 'light' || v === 'dark' || v === 'system') setModeState(v); })
      .catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setItem('themeMode', m).catch(() => {});
  }, []);

  const value = useMemo<Value>(() => {
    const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
    return { c: isDark ? palettes.dark : palettes.light, isDark, mode, setMode };
  }, [mode, system, setMode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppTheme must be used inside ThemeProvider');
  return v;
}
