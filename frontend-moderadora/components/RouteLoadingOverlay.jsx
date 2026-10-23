'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import AstroLoader from './AstroLoader';

const MIN_TRANSITION_MS = 900;
const MAX_TRANSITION_MS = 6000;

/**
 * loading.js cobre o streaming do App Router, mas navegacoes client-side rapidas
 * podem nem renderiza-lo. Este overlay mostra a animacao ao clicar em Links
 * internos, e a encerra apos a mudanca efetiva de rota.
 */
export default function RouteLoadingOverlay() {
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const pending = useRef(null);
  const closeTimer = useRef(null);
  const fallbackTimer = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const clearTimers = () => {
      clearTimeout(closeTimer.current);
      clearTimeout(fallbackTimer.current);
    };

    const handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin || nextUrl.pathname === currentUrl.pathname) return;
      if (!nextUrl.pathname.startsWith('/moderadora')) return;

      clearTimers();
      pending.current = { started: Date.now() };
      setVisible(true);
      // Segurança para navegacoes canceladas ou interrompidas.
      fallbackTimer.current = setTimeout(() => {
        pending.current = null;
        setVisible(false);
      }, MAX_TRANSITION_MS);
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (!pending.current) return;

    const remaining = Math.max(0, MIN_TRANSITION_MS - (Date.now() - pending.current.started));
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      pending.current = null;
      clearTimeout(fallbackTimer.current);
      setVisible(false);
    }, remaining);
  }, [pathname]);

  return visible ? <AstroLoader variant="overlay" label="Carregando página…" /> : null;
}
