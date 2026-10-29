'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import AstroLoader from '@/components/AstroLoader';
import { withVisibleLoading } from '@/lib/loading';
import { Panel, GradientButton, Notice } from '@/components/Panel';
import { useSession } from '@/components/SessionProvider';
import { getForum, editForum, deleteForum, mediaUrl } from '@/lib/api';

export default function DetalhesForum() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useSession();
  const [acao, setAcao] = useState(null);
  useEffect(() => {
    setAcao(new URLSearchParams(window.location.search).get('acao'));
  }, []);
  const [forum, setForum] = useState(null);
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!session) return;
    let active = true;
    withVisibleLoading(() => getForum(session, id))
      .then((r) => {
        if (active) {
          setForum(r);
          setTitulo(r.titulo);
          setDescricao(r.descricao || '');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, id]);
  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await withVisibleLoading(() =>
        editForum(session, id, { titulo: titulo.trim(), descricao: descricao.trim() }),
      );
      setForum(result);
      setEditing(false);
      setNotice('Fórum atualizado com sucesso.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function excluir() {
    if (
      !window.confirm(
        `Excluir o fórum “${forum.titulo}” ? Apenas fóruns sem participantes e sem postagens podem ser excluídos.`,
      )
    )
      return;
    setSaving(true);
    setError('');
    try {
      await withVisibleLoading(() => deleteForum(session, id));
      router.replace('/moderadora/painel');
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }
  const posts = forum?.posts || [];
  return (
    <Shell>
      <Panel title={`Detalhes fórum: ${forum?.titulo || 'Carregando…'}`} className="details-panel">
        {loading ? (
          <AstroLoader label="Carregando fórum…" />
        ) : forum ? (
          <>
            <div className="details-columns">
              <div className="conversation-card" aria-label="Discussões e publicações do fórum">
                {posts.length === 0 ? (
                  <p className="posts-empty">Este fórum ainda não tem postagens.</p>
                ) : (
                  posts.map((p, index) => (
                    <div
                      className={`chat-line ${index % 2 === 0 ? 'chat-line--out' : 'chat-line--in'}`}
                      key={p.id || index}
                    >
                      {index % 2 === 1 && (
                        <div className="chat-avatar" aria-hidden="true">
                          {(p.nome || 'U').slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <span className="chat-sender">{p.nome}</span>
                        <p className="chat-bubble">{p.texto}</p>
                        {p.imagem && (
                          <img
                            className="content-cover"
                            src={mediaUrl(p.imagem)}
                            alt="Imagem da postagem"
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="details-right">
                <div className="status-box">Fórum cadastrado · consulta administrativa</div>
                {editing ? (
                  <form className="forum-edit-form" onSubmit={salvar}>
                    <label>
                      Título
                      <input
                        maxLength={255}
                        required
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                      />
                    </label>
                    <label>
                      Descrição
                      <textarea
                        maxLength={255}
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                      />
                    </label>
                    <div className="edit-controls">
                      <GradientButton type="submit" disabled={saving}>
                        Salvar
                      </GradientButton>
                      <button type="button" onClick={() => setEditing(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-card notes-card">
                    <p>
                      <strong>
                        <em>Observações:</em>
                      </strong>{' '}
                      {forum.descricao || 'Sem descrição cadastrada para este fórum.'}
                    </p>
                    <p className="forum-post-count">
                      {forum.quantidade_postagens ?? posts.length} postagens
                    </p>
                  </div>
                )}
                {acao === 'excluir' && (
                  <p className="action-tip">
                    Para excluir o fórum, clique no botão abaixo e confirme.
                  </p>
                )}
                <div className="detail-buttons">
                  <GradientButton
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setError('');
                    }}
                    disabled={saving}
                  >
                    Editar fórum
                  </GradientButton>
                  <GradientButton type="button" onClick={excluir} disabled={saving}>
                    Excluir fórum
                  </GradientButton>
                </div>
              </div>
            </div>
            <Notice message={error} />
            <Notice message={notice} type="success" />
          </>
        ) : (
          <Notice message={error} />
        )}
      </Panel>
      {saving && <AstroLoader variant="overlay" label="Salvando alterações do fórum…" />}
    </Shell>
  );
}
