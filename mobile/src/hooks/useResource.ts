import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { errorMessage } from '../services/api';

// Respostas de um foco anterior são ignoradas após sair da tela.
export function useResource<T>(loader: (signal?: AbortSignal) => Promise<T>, enabled = true) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const abort = useRef<AbortController | undefined>(undefined);
  const currentLoader = useRef(loader);
  currentLoader.current = loader;
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
      if (request === generation.current) setError(errorMessage(cause));
    } finally { if (request === generation.current) setLoading(false); }
  }, [enabled]);
  useFocusEffect(useCallback(() => {
    if (enabled) void reload();
    else { setData(undefined); setLoading(false); setError(''); }
    return () => { generation.current++; abort.current?.abort(); };
  }, [reload, enabled]));
  return { data, setData, loading, error, reload };
}
