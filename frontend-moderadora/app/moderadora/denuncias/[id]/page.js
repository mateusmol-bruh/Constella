'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import AstroLoader from '@/components/AstroLoader';
import { withVisibleLoading } from '@/lib/loading';
import {Panel,GradientButton,Notice} from '@/components/Panel';
import {useSession} from '@/components/SessionProvider';
import {getDenuncia,setStatusDenuncia} from '@/lib/api';
import {formatDate,statusLabel} from '@/lib/format';

export default function DetalhesDenuncia() {
  const {id}=useParams();
  const {session}=useSession();
  const router=useRouter();
  const [acao,setAcao]=useState(null);
  useEffect(()=>{setAcao(new URLSearchParams(window.location.search).get('acao'));},[]);
  const [denuncia,setDenuncia]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [auditWarning,setAuditWarning]=useState('');
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    if(!session)return;
    let active=true;
    withVisibleLoading(() => getDenuncia(session,id)).then(r=>{if(active)setDenuncia(r);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[session,id]);
  async function mudarStatus(status) {
    setSaving(true);setError('');setNotice('');setAuditWarning('');
    try {
      const result = await withVisibleLoading(() => setStatusDenuncia(session,id,status));
      setDenuncia(prev=>({...prev,status:result.status || status}));
      if (result.historicoConfirmado) {
        setNotice(session.demo
          ? 'Status atualizado e ação adicionada ao histórico da demonstração.'
          : 'Status atualizado e ação confirmada no Histórico de Moderação.');
      } else {
        setNotice('Status da denúncia atualizado.');
        setAuditWarning(result.erroConsultaHistorico
          ? 'Não foi possível consultar o histórico do servidor. Confira os registros em Ver Relatórios.'
          : 'A API de relatórios ainda não confirmou esta ação. Ela aparecerá em Ver Relatórios como pendente de confirmação; verifique se o back-end está atualizado.');
      }
    } catch(e) {setError(e.message);} finally{setSaving(false);}
  }
  const pessoa=denuncia?.denunciante?.email||`#${id}`;
  return <Shell><Panel title={`Detalhes chamado ${pessoa}`} className="details-panel">
    {loading ? <AstroLoader label="Carregando denúncia…" /> : denuncia ? <>
      <div className="details-columns">
        <div className="text-card report-description"><p><strong><em>Detalhes:</em></strong> {denuncia.motivo}</p><div className="report-meta">Denunciado: {denuncia.alvo?.nome||denuncia.alvo?.conteudo||'Conteúdo sinalizado'}<br/>Recebida em {formatDate(denuncia.data)}</div></div>
        <div className="details-right">
          <div className="status-box">{session.demo?'Identificado pelo algoritmo':'Denúncia recebida'} · {statusLabel(denuncia.status)}</div>
          <div className="text-card notes-card"><p><strong><em>Observações:</em></strong> {denuncia.tipo==='USUARIA'?'A denúncia envolve o comportamento de uma usuária. Revise as informações antes de tomar uma decisão.':'A denúncia envolve conteúdo da comunidade. Confira o motivo e a publicação sinalizada antes de concluir a análise.'}</p></div>
          {acao==='banir' && <Notice message="O banimento de contas ainda não está implementado no backend. Nenhuma usuária foi bloqueada."/>}
          <div className="detail-buttons">
            <GradientButton type="button" onClick={()=>setNotice('O backend ainda não oferece bloqueio de usuárias. Nenhuma conta foi banida.')} disabled={saving}>Banir usuária</GradientButton>
            <GradientButton type="button" onClick={()=>mudarStatus('REJEITADA')} disabled={saving || denuncia.status==='REJEITADA'}>Manter usuária</GradientButton>
          </div>
          <button className="resolution-button" disabled={saving || denuncia.status==='RESOLVIDA'} onClick={()=>mudarStatus('RESOLVIDA')}>Marcar denúncia como resolvida</button>
        </div>
      </div>
      <Notice message={error}/><Notice message={notice} type="success"/>
      {auditWarning && <p className="audit-alert" role="status">{auditWarning}</p>}
      {notice && <Link className="audit-history-link" href="/moderadora/ver-relatorios">Ver Relatórios e Histórico de Moderação →</Link>}
    </> : <Notice message={error}/>} 
    <button type="button" className="back-bottom" onClick={()=>router.push('/moderadora/painel')}>Voltar ao painel</button>
  </Panel>{saving && <AstroLoader variant="overlay" label="Atualizando denúncia…" />}</Shell>;
}
