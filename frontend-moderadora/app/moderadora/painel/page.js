'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Panel, Notice } from '@/components/Panel';
import AstroLoader from '@/components/AstroLoader';
import { useSession } from '@/components/SessionProvider';
import { getDashboard } from '@/lib/api';
export default function Painel() {
  const { session } = useSession();
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!session) return;
    try {
      const d = await getDashboard();
      setData(d);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [session]);
  useEffect(() => {
    let active = true,
      timer;
    async function cycle() {
      await load();
      if (active) timer = setTimeout(cycle, 30000);
    }
    void cycle();
    const focus = () => void load();
    window.addEventListener('focus', focus);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('focus', focus);
    };
  }, [load]);
  const r = data?.resumo;
  return (
    <Shell dashboard>
      <div className="list-toolbar">
        <h1>Painel de moderação</h1>
        <button type="button" onClick={load}>
          Atualizar
        </button>
      </div>
      <Notice message={error} />
      {loading ? (
        <AstroLoader label="Carregando dados reais…" />
      ) : (
        data && (
          <>
            <div className="metric-grid">
              {[
                ['Usuárias', r.usuarias],
                ['Fóruns', r.forunsAtivos],
                ['Gratuitos publicados', r.conteudosPostados],
                ['PRO publicados', r.conteudosPro],
                ['Denúncias pendentes', r.denunciasPendentes],
                ['Em análise', r.denunciasEmAnalise],
                ['Resolvidas', r.denunciasResolvidas],
                ['Denúncias recebidas', r.denuncias],
              ].map(([name, value]) => (
                <div className="metric-card" key={name}>
                  <span>{name}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="dashboard-grid">
              <div className="dashboard-side">
                <Panel title="Ações">
                  <div className="quick-links">
                    <Link className="quick-link" href="/moderadora/criar-conteudo">
                      Criar conteúdo
                    </Link>
                    <Link className="quick-link" href="/moderadora/gerar-relatorio">
                      Gerar relatório
                    </Link>
                  </div>
                </Panel>
              </div>
              <div className="dashboard-main">
                <Panel title="Denúncias pendentes">
                  <div className="list-rows">
                    {data.denuncias.length ? (
                      data.denuncias.map((d) => (
                        <Link
                          className="data-row"
                          key={d.id}
                          href={'/moderadora/denuncias/' + d.id}
                        >
                          <span className="row-name">
                            #{d.id} · {d.motivo}
                          </span>
                          <span>Analisar →</span>
                        </Link>
                      ))
                    ) : (
                      <p>Nenhuma denúncia pendente.</p>
                    )}
                  </div>
                  <Link href="/moderadora/denuncias">Ver todas as denúncias →</Link>
                </Panel>
                <Panel title="Fóruns recentes">
                  {data.foruns.length ? (
                    data.foruns.map((f) => (
                      <Link className="data-row" key={f.id} href={'/moderadora/foruns/' + f.id}>
                        <span className="row-name">{f.titulo}</span>
                        <span>Consultar →</span>
                      </Link>
                    ))
                  ) : (
                    <p>Nenhum fórum cadastrado.</p>
                  )}
                  <Link href="/moderadora/foruns">Ver todos os fóruns →</Link>
                </Panel>
              </div>
            </div>
          </>
        )
      )}
    </Shell>
  );
}
