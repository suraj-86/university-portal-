import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setUnauthorizedHandler } from '@/services/api';
import { getItem, removeItem, setItem } from '@/services/storage';

export type AuthUser = {
  id: number;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  full_name?: string;
  username?: string;
  must_change_password?: boolean;
};

type Value = {
  user: AuthUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  passwordChanged: () => void;
};

const Ctx = createContext<Value | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [token, raw] = await Promise.all([getItem('authToken'), getItem('authUser')]);
        if (token && raw) setUser(JSON.parse(raw));
      } catch {
        /* nothing stored */
      }
      setReady(true);
    })();
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await Promise.all([removeItem('authToken'), removeItem('authUser')]).catch(() => {});
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { logout(); });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/login', { username: username.trim(), password });
    const { token, user: u } = res.data;
    if (!token || !u) throw new Error('The server did not return a session. Please try again.');
    await setItem('authToken', token);
    await setItem('authUser', JSON.stringify(u));
    setUser(u);
    return u as AuthUser;
  }, []);

  const passwordChanged = useCallback(() => {
    setUser((cur) => {
      if (!cur) return cur;
      const next = { ...cur, must_change_password: false };
      setItem('authUser', JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout, passwordChanged }), [user, ready, login, logout, passwordChanged]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
