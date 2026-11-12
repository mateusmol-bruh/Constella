'use client';
import { useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Panel, Notice } from '@/components/Panel';
import { getUsuarias } from '@/lib/api';
import { useAdminResource } from '@/lib/useAdminResource';
import AstroLoader from '@/components/AstroLoader';
export default function Usuarias() {
  const [q, setQ] = useState(''),
    [search, setSearch] = useState(''),
    [pagina, setPagina] = useState(1),
    r = useAdminResource(() => getUsuarias(search, pagina), search + pagina);
  return (
    <Shell>
      <Panel title="Consulta de usuárias">
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
            setPagina(1);
            r.reload();
          }}
        >
          <label>
            Nome
            <input
              maxLength={100}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <button>Buscar</button>
        </form>
        <Notice message={r.error} />
        {r.loading ? (
          <AstroLoader label="Carregando usuárias…" />
        ) : (
          r.data && (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Verificação</th>
                      <th>Conta</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.data.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.nome}</td>
                        <td>
                          {u.verificada ? 'Verificada' : 'Não verificada'}
                        </td>
                        <td>
                          <span
                            className={
                              'account-status ' + (u.banida ? 'is-banned' : '')
                            }
                          >
                            {u.banida ? 'Banida' : 'Permitida'}
                          </span>
                        </td>
                        <td>
                          <Link href={'/moderadora/usuarias/' + u.id}>
                            Ver detalhes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!r.data.length && <p>Nenhuma usuária encontrada.</p>}
              <div className="pagination">
                <button
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </button>
                <span>Página {pagina}</span>
                <button
                  disabled={r.data.length < 50}
                  onClick={() => setPagina((p) => p + 1)}
                >
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
