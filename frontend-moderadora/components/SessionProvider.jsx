'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import RouteLoadingOverlay from './RouteLoadingOverlay';

const Context=createContext(null);
const KEY='constella-moderadora-sessao';
export function SessionProvider({children}) {
  const [session,setSession]=useState(null);
  const [ready,setReady]=useState(false);
  const router=useRouter();
  const pathname=usePathname();
  useEffect(()=>{
    try {
      const raw=sessionStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {/* Pode ter sido removida */}
    setReady(true);
  },[]);
  useEffect(()=>{
    if (!ready) return;
    if (pathname.startsWith('/moderadora/') && !session) router.replace('/moderadora');
    if (pathname === '/moderadora' && session) router.replace('/moderadora/painel');
  },[ready,pathname,session,router]);
  const save=useCallback((value)=>{
    sessionStorage.setItem(KEY,JSON.stringify(value));setSession(value);
  },[]);
  const logout=useCallback(()=>{
    sessionStorage.removeItem(KEY);setSession(null);router.replace('/moderadora');
  },[router]);
  const value=useMemo(()=>({session,ready,save,logout}),[session,ready,save,logout]);
  return <Context.Provider value={value}>{children}<RouteLoadingOverlay /></Context.Provider>;
}
export function useSession() {
  const session=useContext(Context);
  if (!session) throw new Error('useSession precisa de SessionProvider');
  return session;
}
