'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Panel, Notice } from '@/components/Panel';
import AstroLoader from '@/components/AstroLoader';
import { getConteudos, publishConteudo, deleteConteudo, mediaUrl } from '@/lib/api';
import { useAdminResource } from '@/lib/useAdminResource';
import { formatDate } from '@/lib/format';
export default function Conteudos() {
  const [q, setQ] = useState(''),
    [search, setSearch] = useState(''),
    [tipo, setTipo] = useState('normal'),
    [status, setStatus] = useState(''),
    [pagina, setPagina] = useState(1),
    [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('tipo')==='pro')setTipo('pro');},[]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q);
      setPagina(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  const r = useAdminResource(
    () => getConteudos({ tipo, pagina, q: search, publicado: status }),
    JSON.stringify([tipo, pagina, search, status]),
  );
  const items = r.data || [];
  async function action(c, remove = false) {
    if (
      remove &&
      !window.confirm('Excluir este conteúdo? A exclusão só é permitida sem histórico de acessos.')
    )
      return;
    setError('');
    setBusy(c.tipo + c.id);
    try {
      if (remove) await deleteConteudo(c.tipo, c.id);
      else await publishConteudo(c.tipo, c.id, !c.publicado);
      r.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  return (
    <Shell>
      <Panel title="Conteúdos">
        <div className="list-toolbar">
          <Link className="gradient-button" href="/moderadora/criar-conteudo">
            Criar conteúdo
          </Link>
          <button onClick={r.reload}>Atualizar</button>
        </div>
        <div className="filters">
          <label>
            Buscar
            <input maxLength={100} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label>
            Tipo
            <select
              aria-label="Tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                setPagina(1);
              }}
            >
              <option value="normal">Gratuito</option>
              <option value="pro">PRO</option>
            </select>
          </label>
          <label>
            Status
            <select
              aria-label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              <option value="true">Publicado</option>
              <option value="false">Rascunho / despublicado</option>
            </select>
          </label>
        </div>
        <Notice message={error || r.error} />
        {r.loading ? (
          <AstroLoader label="Carregando conteúdos…" />
        ) : (
          r.data && (
            <>
              <p>Conteúdos consultados no banco, com 50 resultados por página.</p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Conteúdo</th>
                      <th>Tipo / categoria</th>
                      <th>Status</th>
                      <th>Publicação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.tipo + c.id}>
                        <td>
                          {c.capa && <img className="table-cover" src={mediaUrl(c.capa)} alt="" />}
                          {c.titulo}
                        </td>
                        <td>
                          {c.tipo === 'pro' ? 'PRO' : 'Gratuito'}
                          {c.categoria ? ' · ' + c.categoria : ''}
                        </td>
                        <td>{c.publicado ? 'Publicado' : 'Não publicado'}</td>
                        <td>{formatDate(c.data_publicacao)}</td>
                        <td className="table-actions">
                          <Link href={'/moderadora/conteudos/' + c.tipo + '/' + c.id}>Editar</Link>
                          <button disabled={busy === c.tipo + c.id} onClick={() => action(c)}>
                            {c.publicado ? 'Despublicar' : 'Publicar'}
                          </button>
                          <button disabled={busy === c.tipo + c.id} onClick={() => action(c, true)}>
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!items.length && <p>Nenhum conteúdo encontrado.</p>}
              <div className="pagination">
                <button disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </button>
                <span>Página {pagina}</span>
                <button disabled={items.length < 50} onClick={() => setPagina((p) => p + 1)}>
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
