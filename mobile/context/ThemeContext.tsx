import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();

  const [theme, setTheme] = useState<ThemeMode>(
    systemScheme === 'dark' ? 'dark' : 'light'
  );

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme: () => {
        setTheme((current) =>
          current === 'dark' ? 'light' : 'dark'
        );
      },
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useAppTheme must be used inside ThemeProvider'
    );
  }

  return context;
}