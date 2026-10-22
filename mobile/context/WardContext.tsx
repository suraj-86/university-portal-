import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export type Ward = { student_id: number; user_id: number; full_name: string; roll_number?: string };

type Value = {
  wards: Ward[];
  ward: Ward | null;
  loading: boolean;
  error: string | null;
  select: (studentId: number) => void;
};

const Ctx = createContext<Value>({ wards: [], ward: null, loading: false, error: null, select: () => {} });

// For parents: the list of children and which one every page is showing.
export function WardProvider({ enabled, children }: PropsWithChildren<{ enabled: boolean }>) {
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;
    setLoading(true);
    api.get(`/parent/${user.id}/wards-overview`)
      .then((r) => { if (!cancelled) { setWards(r.data?.allWards || []); setError(null); } })
      .catch(() => { if (!cancelled) setError('Could not load your children. Pull down to retry.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, user]);

  const value = useMemo<Value>(() => {
    const ward = wards.find((w) => w.student_id === selected) || wards[0] || null;
    return { wards, ward, loading, error, select: setSelected };
  }, [wards, selected, loading, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useWards = () => useContext(Ctx);
