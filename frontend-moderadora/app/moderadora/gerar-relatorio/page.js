'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import AstroLoader from '@/components/AstroLoader';
import { withVisibleLoading } from '@/lib/loading';
import UploadBox from '@/components/UploadBox';
import { Panel, GradientButton, Notice } from '@/components/Panel';
import { useSession } from '@/components/SessionProvider';
import { createRelatorio } from '@/lib/api';

export default function GerarRelatorio() {
  const { session } = useSession();
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await withVisibleLoading(() =>
        createRelatorio(session, { titulo: titulo.trim(), conteudo: conteudo.trim() }),
      );
      setSuccess('Relatório registrado com sucesso! Abrindo seus relatórios…');
      setTitulo('');
      setConteudo('');
      setTimeout(() => router.push('/moderadora/ver-relatorios'), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Shell form>
      <Panel title="Gerar relatório" className="form-panel">
        <form onSubmit={handleSubmit}>
          <div className="form-columns">
            <div className="form-fields">
              <label className="form-label">
                Título:
                <input
                  maxLength={100}
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título do relatório"
                />
              </label>
              <label className="form-label content-label">
                Conteúdo:
                <textarea
                  required
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Descreva as informações do relatório"
                />
              </label>
            </div>
          </div>
          <Notice message={error} />
          <Notice message={success} type="success" />
          <GradientButton type="submit" disabled={saving} className="submit-floating">
            {saving ? 'Salvando…' : 'Concluir'}
          </GradientButton>
        </form>
      </Panel>
      {saving && <AstroLoader variant="overlay" label="Salvando relatório…" />}
    </Shell>
  );
}
