'use client';
import Link from 'next/link';
import { House, LogOut } from 'lucide-react';
import Brand from './Brand';
import AstroLoader from './AstroLoader';
import {useSession} from './SessionProvider';
export default function Shell({ children, dashboard=false, form=false }) {
  const {session,ready,logout}=useSession();
  if (!ready || !session) return <AstroLoader variant="fullscreen" label="Preparando painel…" />;
  return (
    <main className={`screen ${dashboard ? 'screen--dashboard' : ''} ${form ? 'screen--form' : ''}`.trim()}>
      <div className={`workspace ${dashboard ? 'workspace--dashboard' : ''} ${form ? 'workspace--form' : ''}`.trim()}>
        <header className="topbar">
          {dashboard ? <h1 className="dashboard-title">Painel de moderadora</h1> : (
            <Link className="home-link" href="/moderadora/painel" aria-label="Voltar ao painel" title="Voltar ao painel"><House fill="currentColor" strokeWidth={1.7} size={30}/></Link>
          )}
          <div className="topbar-actions">
            <Brand />
            <button type="button" className="logout-button" aria-label="Sair da conta" onClick={logout} title="Sair da conta"><LogOut size={20}/></button>
          </div>
        </header>
        {session.demo && <div className="demo-label" role="status">Modo demonstração · dados de exemplo, não enviados ao servidor</div>}
        {children}
      </div>
    </main>
  );
}
