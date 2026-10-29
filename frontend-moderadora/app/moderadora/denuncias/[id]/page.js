'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Panel, GradientButton, Notice } from '@/components/Panel';
import AstroLoader from '@/components/AstroLoader';
import { getDenuncia, setStatusDenuncia, mediaUrl } from '@/lib/api';
import { useAdminResource } from '@/lib/useAdminResource';
import { statusLabel, formatDate } from '@/lib/format';
export default function Detalhe() {
  const { id } = useParams();
  const r = useAdminResource(() => getDenuncia(null, id), String(id)),
    [status, setStatus] = useState('PENDENTE'),
    [decisao, setDecisao] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    if (r.data) setStatus(r.data.status);
  }, [r.data]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await setStatusDenuncia(null, id, status, decisao);
      setNotice('Decisão e status salvos no histórico de moderação.');
      setDecisao('');
      r.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const d = r.data;
  return (
    <Shell>
      <Panel title={'Denúncia #' + id}>
        <Notice message={error || r.error} />
        <Notice type="success" message={notice} />
        {r.loading ? (
          <AstroLoader label="Carregando denúncia…" />
        ) : (
          d && (
            <>
              <div className="details-columns">
                <div className="text-card report-description">
                  <p>
                    <strong>Tipo:</strong> {d.tipo}
                  </p>
                  <p>
                    <strong>Motivo:</strong> {d.motivo}
                  </p>
                  {d.descricao && (
                    <p>
                      <strong>Descrição:</strong> {d.descricao}
                    </p>
                  )}
                  <p>
                    Recebida em {formatDate(d.data)} · {statusLabel(d.status)}
                  </p>
                  <p>
                    Denunciante: {d.denunciante.nome} (#{d.denunciante.id})
                  </p>
                  <p>
                    Item denunciado #{d.alvo?.id}: {d.alvo?.nome || d.alvo?.conteudo}
                  </p>
                  {d.alvo?.imagem && (
                    <img
                      className="content-cover"
                      src={mediaUrl(d.alvo.imagem)}
                      alt="Imagem denunciada"
                    />
                  )}
                  {d.alvo?.forum && (
                    <Link href={'/moderadora/foruns/' + d.alvo.forum}>Consultar fórum</Link>
                  )}
                </div>
                <form className="forum-edit-form" onSubmit={submit}>
                  <label>
                    Status
                    <select
                      aria-label="Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {['PENDENTE', 'EM_ANALISE', 'RESOLVIDA', 'REJEITADA'].map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Decisão / observação
                    <textarea
                      required={['RESOLVIDA', 'REJEITADA'].includes(status)}
                      maxLength={2000}
                      value={decisao}
                      onChange={(e) => setDecisao(e.target.value)}
                      placeholder="Registre a justificativa da análise"
                    />
                  </label>
                  <GradientButton disabled={busy} type="submit">
                    {busy ? 'Salvando…' : 'Salvar análise'}
                  </GradientButton>
                </form>
              </div>
              <h3>Histórico da denúncia</h3>
              {d.historico.length ? (
                d.historico.map((h) => (
                  <div className="text-card" key={h.id}>
                    <p>{h.descricao}</p>
                    <small>
                      {h.moderadora} · {formatDate(h.data)}
                    </small>
                  </div>
                ))
              ) : (
                <p>Ainda não há decisões registradas.</p>
              )}
            </>
          )
        )}
        <Link href="/moderadora/denuncias">Voltar às denúncias</Link>
      </Panel>
    </Shell>
  );
}
