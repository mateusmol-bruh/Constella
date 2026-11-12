'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, logoutModeradora, setCsrf } from '@/lib/api';
import RouteLoadingOverlay from './RouteLoadingOverlay';
const Context = createContext(null);
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const router = useRouter(),
    pathname = usePathname(),
    generation = useRef(0);
  const save = useCallback((value) => {
    generation.current++;
    setCsrf(value.csrf);
    setSession({ moderadora: value.moderadora });
    setError('');
    setReady(true);
  }, []);
  const restore = useCallback(async () => {
    const key = ++generation.current;
    setError('');
    try {
      const value = await getSession();
      if (key === generation.current) {
        setCsrf(value.csrf);
        setSession({ moderadora: value.moderadora });
      }
    } catch (e) {
      if (key === generation.current) {
        setSession(null);
        setCsrf(null);
        if (e.status !== 401) setError(e.message);
      }
    } finally {
      if (key === generation.current) setReady(true);
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.removeItem('constella-moderadora-sessao');
    } catch {}
    void restore();
    const expired = () => {
      generation.current++;
      setSession(null);
      setCsrf(null);
      setError('Sua sessão expirou. Entre novamente.');
      setReady(true);
    };
    window.addEventListener('constella:session-expired', expired);
    return () => {
      generation.current++;
      window.removeEventListener('constella:session-expired', expired);
    };
  }, [restore]);
  useEffect(() => {
    if (!ready) return;
    if (pathname.startsWith('/moderadora/') && !session) router.replace('/moderadora');
    if (pathname === '/moderadora' && session) router.replace('/moderadora/painel');
  }, [ready, pathname, session, router]);
  const logout = useCallback(async () => {
    try {
      await logoutModeradora();
    } catch (e) {
      if (e.status !== 401) throw e;
    }
    generation.current++;
    setCsrf(null);
    setSession(null);
    setError('');
    router.replace('/moderadora');
  }, [router]);
  const value = useMemo(
    () => ({ session, ready, save, logout, error, retry: restore }),
    [session, ready, save, logout, error, restore],
  );
  return (
    <Context.Provider value={value}>
      {children}
      <RouteLoadingOverlay />
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider ausente');
  return value;
}
