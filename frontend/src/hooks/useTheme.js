import { useCallback, useEffect, useState } from 'react';

const read = () => {
  try { return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
};

export default function useTheme() {
  const [theme, setThemeState] = useState(read);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  const setTheme = useCallback((t) => {
    try { localStorage.setItem('theme', t); } catch { }
    setThemeState(t);
  }, []);
  return { theme, setTheme };
}
