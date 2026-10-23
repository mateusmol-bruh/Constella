'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, FileText, PlusCircle, Trash2 } from 'lucide-react';
import Shell from '@/components/Shell';
import AstroLoader from '@/components/AstroLoader';
import { withVisibleLoading } from '@/lib/loading';
import { Panel, Notice } from '@/components/Panel';
import { useSession } from '@/components/SessionProvider';
import { getDashboard } from '@/lib/api';

function Action({ href, icon: Icon, label }) {
  return (
    <Link href={href} className="item-action" aria-label={label}>
      <span className="action-pill" aria-hidden="true">
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="action-tooltip" aria-hidden="true">{label}</span>
    </Link>
  );
}
function Empty({children}) {return <p className="empty-inline">{children}</p>;}
export default function Painel() {
  const {session}=useSession();
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if (!session) return;
    let active=true;
    withVisibleLoading(() => getDashboard(session)).then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[session]);
  const resumo=data?.resumo||{};
  const pending=(data?.denuncias||[]).filter(x=>x.status==='PENDENTE');
  return <Shell dashboard>
    <Notice message={error}/>
    {loading ? <AstroLoader label="Carregando informações do painel…" /> : data ? (
      <div className="dashboard-grid">
        <div className="dashboard-side">
          <Panel title="Resumo Rápido"><div className="summary-list">
            <p>Denúncias pendentes: <strong>{resumo.denunciasPendentes ?? pending.length}</strong></p>
            <p>Fóruns ativos: <strong>{resumo.forunsAtivos ?? data.foruns.length}</strong></p>
            <p>Conteúdos postados: <strong>{resumo.conteudosPostados ?? '—'}</strong></p>
          </div></Panel>
          <div className="quick-links">
            <Link className="quick-link" href="/moderadora/criar-conteudo"><span>Criar conteúdo</span><PlusCircle size={27}/></Link>
            <Link className="quick-link" href="/moderadora/gerar-relatorio"><span>Gerar relatório</span><PlusCircle size={27}/></Link>
            <Link className="quick-link" href="/moderadora/ver-relatorios"><span>Ver Relatórios</span><FileText size={27}/></Link>
          </div>
        </div>
        <div className="dashboard-main">
          <Panel title="Denúncias" className="list-panel"><div className="list-rows">
            {pending.length===0 ? <Empty>Nenhuma denúncia pendente.</Empty> : pending.slice(0,3).map(d=><div className="data-row" key={d.id}>
              <span className="row-name" title={d.denunciante?.email}>{d.denunciante?.email||'Denúncia sem remetente'}</span>
              <div className="row-actions"><Action href={`/moderadora/denuncias/${d.id}`} icon={Eye} label="Detalhes"/><Action href={`/moderadora/denuncias/${d.id}?acao=banir`} icon={Trash2} label="Banir"/></div>
            </div>)}
          </div></Panel>
          <Panel title="Fóruns" className="list-panel"><div className="list-rows">
            {(data.foruns||[]).length===0 ? <Empty>Nenhum fórum encontrado.</Empty> : data.foruns.map(f=><div className="data-row" key={f.id}>
              <span className="row-name" title={f.titulo}>Fórum : {f.titulo}</span>
              <div className="row-actions"><Action href={`/moderadora/foruns/${f.id}`} icon={Eye} label="Ver"/><Action href={`/moderadora/foruns/${f.id}?acao=excluir`} icon={Trash2} label="Deletar"/></div>
            </div>)}
          </div></Panel>
        </div>
      </div>
    ) : <button className="retry-button" onClick={()=>window.location.reload()}>Tentar novamente</button>}
  </Shell>;
}
