'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import AstroLoader from '@/components/AstroLoader';
import { withVisibleLoading } from '@/lib/loading';
import { Panel, GradientButton, Notice } from '@/components/Panel';
import { useSession } from '@/components/SessionProvider';
import {
  getForum,
  getForumUsers,
  removeForumUser,
  editForum,
  deleteForum,
  mediaUrl,
} from '@/lib/api';

export default function DetalhesForum() {
  const { id } = useParams();
  const router = useRouter();
  const { session } = useSession();
  const remocaoDialog = useRef(null);
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
  const [usuarias, setUsuarias] = useState([]);
  const [usuariasPagina, setUsuariasPagina] = useState(1);
  const [usuariasLoading, setUsuariasLoading] = useState(true);
  const [usuariasError, setUsuariasError] = useState('');
  const [removendo, setRemovendo] = useState(null);
  const [usuariaParaRemover, setUsuariaParaRemover] = useState(null);
  const [justificativaRemocao, setJustificativaRemocao] = useState('');
  const [erroRemocao, setErroRemocao] = useState('');
  const [usuariasReload, setUsuariasReload] = useState(0);
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
  useEffect(() => {
    if (!session) return;
    let active = true;
    setUsuariasLoading(true);
    setUsuariasError('');
    getForumUsers(session, id, usuariasPagina)
      .then((result) => {
        if (active) setUsuarias(result);
      })
      .catch((e) => {
        if (active) setUsuariasError(e.message);
      })
      .finally(() => {
        if (active) setUsuariasLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, id, usuariasPagina, usuariasReload]);
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
  function iniciarRemocao(usuaria) {
    setUsuariaParaRemover(usuaria);
    setJustificativaRemocao('');
    setErroRemocao('');
    remocaoDialog.current?.showModal();
  }
  async function confirmarRemocao() {
    const usuaria = usuariaParaRemover;
    const justificativa = justificativaRemocao.trim();
    if (!usuaria || !justificativa || removendo !== null) return;
    setRemovendo(usuaria.id);
    setUsuariasError('');
    setErroRemocao('');
    try {
      await withVisibleLoading(() =>
        removeForumUser(session, id, usuaria.id, justificativa),
      );
      remocaoDialog.current?.close();
      setUsuariaParaRemover(null);
      setJustificativaRemocao('');
      setNotice(`${usuaria.nome} foi removida do fórum. Ela poderá entrar novamente.`);
      if (usuarias.length === 1 && usuariasPagina > 1) {
        setUsuariasPagina((page) => page - 1);
      } else {
        setUsuariasReload((version) => version + 1);
      }
    } catch (e) {
      setErroRemocao(e.message);
    } finally {
      setRemovendo(null);
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
                <p className="forum-delete-note">
                  Para preservar o histórico, somente fóruns sem participantes e sem postagens podem
                  ser excluídos.
                </p>
              </div>
            </div>
            <section className="forum-members" aria-labelledby="forum-members-title">
              <h2 id="forum-members-title">Usuárias no fórum</h2>
              <Notice message={usuariasError} />
              {usuariasLoading ? (
                <AstroLoader label="Carregando participantes…" />
              ) : usuarias.length ? (
                <>
                  <div className="forum-member-list">
                    {usuarias.map((usuaria) => {
                      const foto = mediaUrl(usuaria.foto);
                      return (
                        <div className="forum-member-row" key={usuaria.id}>
                          <div className="forum-member-profile">
                            {foto ? (
                              <img src={foto} alt="" />
                            ) : (
                              <span aria-hidden="true">
                                {(usuaria.nome || 'U').slice(0, 1)}
                              </span>
                            )}
                            <span>{usuaria.nome}</span>
                          </div>
                          <button
                            type="button"
                            className="forum-member-remove"
                            disabled={removendo !== null}
                            onClick={() => iniciarRemocao(usuaria)}
                          >
                            Remover do fórum
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pagination">
                    <button
                      type="button"
                      disabled={usuariasPagina === 1}
                      onClick={() => setUsuariasPagina((page) => page - 1)}
                    >
                      Anterior
                    </button>
                    <span>Página {usuariasPagina}</span>
                    <button
                      type="button"
                      disabled={usuarias.length < 50}
                      onClick={() => setUsuariasPagina((page) => page + 1)}
                    >
                      Próxima
                    </button>
                  </div>
                </>
              ) : (
                <p>Nenhuma usuária participa deste fórum.</p>
              )}
            </section>
            <Notice message={error} />
            <Notice message={notice} type="success" />
          </>
        ) : (
          <Notice message={error} />
        )}
        <dialog
          ref={remocaoDialog}
          className="admin-dialog"
          aria-labelledby="remove-forum-user-title"
          onCancel={(event) => {
            if (removendo !== null) event.preventDefault();
          }}
        >
          <h2 id="remove-forum-user-title">Confirmar remoção</h2>
          <p>
            Remover {usuariaParaRemover?.nome || 'esta usuária'} deste fórum? Ela poderá entrar
            novamente depois.
          </p>
          <label className="form-label">
            Justificativa da remoção
            <textarea
              required
              maxLength={2000}
              placeholder="Explique o motivo da remoção desta usuária..."
              value={justificativaRemocao}
              onChange={(event) => setJustificativaRemocao(event.target.value)}
              disabled={removendo !== null}
            />
          </label>
          <Notice message={erroRemocao} />
          <div className="dialog-actions">
            <button
              type="button"
              disabled={removendo !== null}
              onClick={() => remocaoDialog.current?.close()}
            >
              Cancelar
            </button>
            <GradientButton
              type="button"
              disabled={removendo !== null || !justificativaRemocao.trim()}
              onClick={() => void confirmarRemocao()}
            >
              {removendo !== null ? 'Removendo…' : 'Confirmar remoção'}
            </GradientButton>
          </div>
        </dialog>
      </Panel>
      {saving && <AstroLoader variant="overlay" label="Salvando alterações do fórum…" />}
    </Shell>
  );
}
