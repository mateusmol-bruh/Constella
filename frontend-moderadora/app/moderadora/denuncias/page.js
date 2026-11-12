'use client';
import { useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Panel, Notice } from '@/components/Panel';
import AstroLoader from '@/components/AstroLoader';
import { getDenuncias } from '@/lib/api';
import { useAdminResource } from '@/lib/useAdminResource';
import { statusLabel, formatDate } from '@/lib/format';
export default function Denuncias() {
  const [status, setStatus] = useState(''),
    [pagina, setPagina] = useState(1);
  const r = useAdminResource(() => getDenuncias(null, { status, pagina }), status + pagina);
  return (
    <Shell>
      <Panel title="Denúncias">
        <div className="filters">
          <label>
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              {['PENDENTE', 'EM_ANALISE', 'RESOLVIDA', 'REJEITADA'].map((s) => (
                <option value={s} key={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <button onClick={r.reload}>Atualizar</button>
        </div>
        <Notice message={r.error} />
        {r.loading ? (
          <AstroLoader label="Carregando denúncias…" />
        ) : (
          r.data && (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ID / tipo</th>
                      <th>Motivo</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Análise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.data.map((d) => (
                      <tr key={d.id}>
                        <td>
                          #{d.id} · {d.tipo}
                        </td>
                        <td>{d.motivo}</td>
                        <td>{formatDate(d.data)}</td>
                        <td>{statusLabel(d.status)}</td>
                        <td>
                          <Link href={'/moderadora/denuncias/' + d.id}>Abrir denúncia</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!r.data.length && <p>Nenhuma denúncia neste filtro.</p>}
              <div className="pagination">
                <button disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </button>
                <span>Página {pagina}</span>
                <button disabled={r.data.length < 50} onClick={() => setPagina((p) => p + 1)}>
                  Próxima
                </button>
              </div>
            </>
          )
        )}
      </Panel>
    </Shell>
  );
}
