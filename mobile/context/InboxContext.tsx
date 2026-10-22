import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import api from '@/services/api';

type Counts = { notices: number; announcements: number; messages: number; notifications: number };
type Value = Counts & { refresh: () => void };

const empty: Counts = { notices: 0, announcements: 0, messages: 0, notifications: 0 };
const Ctx = createContext<Value>({ ...empty, refresh: () => {} });

// Unread counts for the bell, the messages icon and the badges in the all-pages panel. Polls every 45 s while the app is open.
export function InboxProvider({ children }: PropsWithChildren) {
  const [counts, setCounts] = useState<Counts>(empty);

  const refresh = useCallback(() => {
    api.get('/inbox/counts').then((r) => setCounts({ ...empty, ...(r.data || {}) })).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 45000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [refresh]);

  const value = useMemo(() => ({ ...counts, refresh }), [counts, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useInbox = () => useContext(Ctx);
