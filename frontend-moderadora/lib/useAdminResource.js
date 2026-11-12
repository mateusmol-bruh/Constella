'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/components/SessionProvider';
export function useAdminResource(loader, key = '', interval = 30000) {
  const { session } = useSession(),
    ref = useRef(loader);
  ref.current = loader;
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!session) return;
    let active = true,
      timer,
      cycle = 0;
    async function run(quiet = false) {
      const generation = ++cycle;
      clearTimeout(timer);
      if (!quiet) setLoading(true);
      try {
        const result = await ref.current();
        if (active && generation === cycle) {
          setData(result);
          setError('');
        }
      } catch (e) {
        if (active && generation === cycle) {
          setError(e.message);
          setData(null);
        }
      } finally {
        if (active && generation === cycle) {
          setLoading(false);
          if (interval > 0) timer = setTimeout(() => run(true), interval);
        }
      }
    }
    void run();
    const focus = () => {
      if (document.visibilityState === 'visible') void run(true);
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      active = false;
      cycle++;
      clearTimeout(timer);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [session, key, interval, refresh]);
  const reload = useCallback(() => setRefresh((n) => n + 1), []);
  return { data, loading, error, reload };
}
