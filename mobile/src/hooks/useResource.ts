import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState } from 'react-native';
import { errorMessage, subscribeResourceChanges } from '../services/api';

// Respostas de um foco anterior são ignoradas após sair da tela.
export function useResource<T>(loader: (signal?: AbortSignal) => Promise<T>, enabled = true, refreshInterval = 0, resourceKey = '') {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const previousKey = useRef(resourceKey);
  const abort = useRef<AbortController | undefined>(undefined);
  const currentLoader = useRef(loader);
  useLayoutEffect(() => { currentLoader.current = loader; });
  const reload = useCallback(async (quiet = false) => {
    if (!enabled) return;
    const request = ++generation.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const result = await currentLoader.current(controller.signal);
      if (request === generation.current) setData(result);
    } catch (cause) {
      if (request === generation.current) {
        setData(undefined);
        setError(errorMessage(cause));
      }
    } finally { if (request === generation.current) setLoading(false); }
  }, [enabled]);
  useFocusEffect(useCallback(() => {
    if (previousKey.current !== resourceKey) { previousKey.current = resourceKey; setData(undefined); }
    let active = true;
    let cycle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let invalidation: ReturnType<typeof setTimeout> | undefined;
    async function refresh(quiet = false) {
      const version = ++cycle;
      clearTimeout(timer);
      await reload(quiet);
      if (active && version === cycle && refreshInterval > 0 && AppState.currentState === 'active') timer = setTimeout(() => void refresh(true), refreshInterval);
    }
    if (enabled) void refresh();
    else { setData(undefined); setLoading(false); setError(''); }
    const subscription = AppState.addEventListener('change', state => {
      clearTimeout(timer);
      if (active && enabled && state === 'active') void refresh(true);
    });
    const unsubscribe = subscribeResourceChanges(() => { clearTimeout(invalidation); invalidation = setTimeout(() => { if (active && enabled) void refresh(true); }, 150); });
    return () => { active = false; clearTimeout(timer); clearTimeout(invalidation); unsubscribe(); subscription.remove(); generation.current++; abort.current?.abort(); };
  }, [reload, enabled, refreshInterval, resourceKey]));
  return { data, setData, loading, error, reload };
}
