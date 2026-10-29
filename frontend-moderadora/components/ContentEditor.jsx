'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Shell from './Shell';
import UploadBox from './UploadBox';
import ProMediaUpload from './ProMediaUpload';
import { Panel, GradientButton, Notice } from './Panel';
import AstroLoader from './AstroLoader';
import { getConteudo, saveConteudo, uploadCover, mediaUrl } from '@/lib/api';
import { useSession } from './SessionProvider';
export default function ContentEditor({ tipo: initialTipo = 'normal', id }) {
  const { session } = useSession(),
    router = useRouter();
  const [tipo, setTipo] = useState(initialTipo),
    [form, setForm] = useState({
      titulo: '',
      descricao: '',
      texto: '',
      duracao: '5',
      categoria: '',
      publicado: false,
      capa: null,
    });
  const [file, setFile] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(Boolean(id)),
    [loaded, setLoaded] = useState(!id),
    [pending, setPending] = useState({});
  const mediaPending = Object.values(pending).some(Boolean);
  useEffect(() => {
    if (!id || !session) return;
    let active = true;
    setLoading(true);
    getConteudo(initialTipo, id)
      .then((r) => {
        if (active) {
          setForm({
            ...r,
            duracao: String(r.duracao || 5),
            categoria: r.categoria || '',
          });
          setLoaded(true);
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
  }, [id, initialTipo, session]);
  const field = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (busy || mediaPending) return;
    setBusy(true);
    setError('');
    try {
      let capa = form.capa;
      if (file) {
        capa = await uploadCover(file);
        field('capa', capa);
        setFile(null);
      }
      await saveConteudo(tipo, id, {
        ...form,
        capa,
        duracao: Number(form.duracao),
      });
      router.push(
        '/moderadora/conteudos' + (tipo === 'pro' ? '?tipo=pro' : ''),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell form>
      <Panel
        title={id ? 'Editar conteúdo' : 'Criar conteúdo'}
        className="form-panel"
      >
        <Notice message={error} />
        {loading ? (
          <AstroLoader label="Carregando conteúdo…" />
        ) : (
          loaded && (
            <form onSubmit={submit}>
              <fieldset className="editor-fieldset" disabled={busy}>
                <div className="content-mode-switch">
                  <label>
                    Tipo{' '}
                    <select
                      aria-label="Tipo de conteúdo"
                      disabled={Boolean(id) || busy || mediaPending}
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                    >
                      <option value="normal">Gratuito</option>
                      <option value="pro">PRO</option>
                    </select>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.publicado}
                      onChange={(e) => field('publicado', e.target.checked)}
                    />{' '}
                    Publicado no aplicativo
                  </label>
                </div>
                <div className="form-columns">
                  <div className="form-fields">
                    <label className="form-label">
                      Título
                      <input
                        maxLength={255}
                        required
                        value={form.titulo}
                        onChange={(e) => field('titulo', e.target.value)}
                      />
                    </label>
                    <label className="form-label">
                      Descrição
                      <textarea
                        maxLength={4000}
                        required
                        value={form.descricao || ''}
                        onChange={(e) => field('descricao', e.target.value)}
                      />
                    </label>
                    <label className="form-label">
                      Categoria
                      <input
                        list="content-categories"
                        maxLength={100}
                        value={form.categoria}
                        onChange={(e) => field('categoria', e.target.value)}
                        placeholder="Categoria do conteúdo"
                      />
                    </label>
                    <datalist id="content-categories">
                      {[
                        'Autocuidado',
                        'Segurança',
                        'Moda e estilo',
                        'Viagens e aventuras',
                        'Estudo e carreira',
                        'Relacionamentos',
                      ].map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <label className="form-label content-label">
                      Corpo do conteúdo
                      <textarea
                        maxLength={100000}
                        required={tipo !== 'pro'}
                        value={form.texto || ''}
                        onChange={(e) => field('texto', e.target.value)}
                      />
                    </label>
                    <label className="duration-label">
                      Duração estimada (minutos)
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        required
                        value={form.duracao}
                        onChange={(e) => field('duracao', e.target.value)}
                      />
                    </label>
                  </div>
                  <div>
                    <h3>Capa pública do catálogo</h3>
                    <UploadBox file={file} onFile={setFile} />
                    {form.capa && !file && (
                      <>
                        <img
                          className="content-cover"
                          src={mediaUrl(form.capa)}
                          alt="Capa atual"
                        />
                        <button
                          type="button"
                          onClick={() => field('capa', null)}
                        >
                          Remover capa
                        </button>
                      </>
                    )}
                    <p>Capa JPG ou PNG de até 2 MB.</p>
                  </div>
                </div>
                {tipo === 'pro' && (
                  <div className="pro-media-grid">
                    {['imagem', 'video'].map((kind) => (
                      <ProMediaUpload
                        key={kind}
                        kind={kind}
                        value={form[kind]}
                        disabled={busy}
                        onPending={(v) =>
                          setPending((p) => ({ ...p, [kind]: v }))
                        }
                        onChange={(v) =>
                          setForm((p) => ({
                            ...p,
                            [kind]: v,
                            [kind + '_pro_id']: v?.id || null,
                          }))
                        }
                      />
                    ))}
                  </div>
                )}
                <Notice
                  type="success"
                  message={
                    form.publicado
                      ? 'Ao salvar, o conteúdo ficará disponível na seção correspondente do aplicativo.'
                      : 'O rascunho ficará disponível somente no painel.'
                  }
                />
                <div className="editor-actions">
                  <GradientButton type="submit" disabled={busy || mediaPending}>
                    {busy ? 'Salvando…' : 'Salvar conteúdo'}
                  </GradientButton>
                  <Link href="/moderadora/conteudos">Cancelar</Link>
                </div>
              </fieldset>
            </form>
          )
        )}
      </Panel>
    </Shell>
  );
}
