import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '@/services/api';

type State = { data: any[] | null; loading: boolean; refreshing: boolean; error: string | null };

// Loads several GET urls together. Keeps the old data on screen while reloading or pulling to refresh,
// and only reports an error when there is nothing to show.
export default function useLoad(urls: string[] | null) {
  const key = urls ? urls.join('|') : '';
  const [state, setState] = useState<State>({ data: null, loading: !!urls, refreshing: false, error: null });
  const [tick, setTick] = useState(0);
  const mode = useRef<'load' | 'refresh'>('load');
  const seenKey = useRef(key);

  useEffect(() => {
    if (!urls) return undefined;
    let cancelled = false;
    const keyChanged = seenKey.current !== key;
    seenKey.current = key;
    setState((s) => ({
      data: keyChanged ? null : s.data,
      loading: keyChanged || !s.data,
      refreshing: mode.current === 'refresh',
      error: null,
    }));
    Promise.all(urls.map((u) => api.get(u).then((r) => r.data)))
      .then((data) => { if (!cancelled) setState({ data, loading: false, refreshing: false, error: null }); })
      .catch((e) => {
        if (cancelled) return;
        setState((s) => ({ data: s.data, loading: false, refreshing: false, error: s.data ? null : errorMessage(e, 'Could not load this page.') }));
      });
    mode.current = 'load';
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => { mode.current = 'load'; setTick((t) => t + 1); }, []);
  const refresh = useCallback(() => { mode.current = 'refresh'; setTick((t) => t + 1); }, []);

  return { ...state, reload, refresh };
}
