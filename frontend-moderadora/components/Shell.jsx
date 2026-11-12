'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import Brand from './Brand';
import AstroLoader from './AstroLoader';
import { Notice } from './Panel';
import { useSession } from './SessionProvider';
export default function Shell({ children, dashboard = false, form = false }) {
  const { session, ready, logout } = useSession();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  if (!ready || !session) return <AstroLoader variant="fullscreen" label="Verificando acesso…" />;
  async function leave() {
    setBusy(true);
    setError('');
    try {
      await logout();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className={'screen ' + (dashboard ? 'screen--dashboard ' : '') + (form ? 'screen--form' : '')}
    >
      <div
        className={
          'workspace ' +
          (dashboard ? 'workspace--dashboard ' : '') +
          (form ? 'workspace--form' : '')
        }
      >
        <header className="topbar">
          <Link href="/moderadora/painel" aria-label="Painel do Constella">
            <Brand />
          </Link>
          <div className="topbar-actions">
            <span className="account-name">{session.moderadora.nome}</span>
            <button
              type="button"
              className="logout-button"
              onClick={leave}
              disabled={busy}
              aria-label="Sair da conta"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <nav className="admin-nav" aria-label="Navegação administrativa">
          <Link href="/moderadora/painel">Painel</Link>
          <Link href="/moderadora/conteudos">Conteúdos</Link>
          <Link href="/moderadora/denuncias">Denúncias</Link>
          <Link href="/moderadora/foruns">Fóruns</Link>
          <Link href="/moderadora/usuarias">Usuárias</Link>
          <Link href="/moderadora/ver-relatorios">Relatórios</Link>
        </nav>
        <Notice message={error} />
        {children}
      </div>
    </main>
  );
}
