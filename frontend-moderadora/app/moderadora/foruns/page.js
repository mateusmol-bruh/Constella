'use client';
import { useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Panel, Notice } from '@/components/Panel';
import { getForuns } from '@/lib/api';
import { useAdminResource } from '@/lib/useAdminResource';
import AstroLoader from '@/components/AstroLoader';
export default function Foruns() {
  const [pagina, setPagina] = useState(1),
    r = useAdminResource(() => getForuns(null, pagina), String(pagina));
  return (
    <Shell>
      <Panel title="Fóruns">
        <button onClick={r.reload}>Atualizar</button>
        <Notice message={r.error} />
        {r.loading ? (
          <AstroLoader label="Carregando fóruns…" />
        ) : (
          r.data && (
            <>
              {r.data.map((f) => (
                <Link className="data-row" key={f.id} href={'/moderadora/foruns/' + f.id}>
                  <span className="row-name">{f.titulo}</span>
                  <span>
                    {f.quantidade_membros} participantes · {f.quantidade_postagens} postagens
                  </span>
                </Link>
              ))}
              {!r.data.length && <p>Nenhum fórum encontrado.</p>}
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
