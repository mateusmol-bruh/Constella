'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, FileText } from 'lucide-react';
import Shell from '@/components/Shell';
import AstroLoader from '@/components/AstroLoader';
import { withVisibleLoading } from '@/lib/loading';
import UploadBox from '@/components/UploadBox';
import VideoUploadBox from '@/components/VideoUploadBox';
import { Panel, GradientButton, Notice } from '@/components/Panel';
import { useSession } from '@/components/SessionProvider';
import { createConteudo, createConteudoPro } from '@/lib/api';
import { isVideoUploadConfigured, uploadProVideo } from '@/lib/video';

export default function CriarConteudo() {
  const { session } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState('normal');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [texto, setTexto] = useState('');
  const [duracao, setDuracao] = useState('5');
  const [file, setFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState('');
  const isPro = mode === 'pro';

  function switchMode(next) {
    if (saving || next === mode) return;
    setMode(next);
    setError(''); setSuccess('');
  }

  function chooseVideo(next) {
    setVideoFile(next);
    setUploadedVideo(null);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(''); setSuccess('');
    if (!session) return;
    if (!isPro && file) {
      setError('A API de conteúdo normal ainda não recebe anexos. Remova o arquivo antes de publicar.');
      return;
    }
    if (isPro && videoFile && !session.demo && !uploadedVideo && !isVideoUploadConfigured()) {
      setError('O upload PRO precisa de um armazenamento configurado. Consulte o README para configurar o Cloudinary no .env.local. Nenhum vídeo foi enviado.');
      return;
    }
    setSaving(true);
    try {
      const base = {
        titulo: titulo.trim(),
        descricao: isPro ? descricao.trim() : texto.trim(),
        texto: texto.trim(),
        duracao: Number(duracao),
      };
      if (isPro) {
        if (videoFile && !session.demo) {
          let url = uploadedVideo?.file === videoFile ? uploadedVideo.url : null;
          if (!url) {
            setStage('Enviando vídeo PRO…');
            url = await withVisibleLoading(() => uploadProVideo(videoFile));
            // Guarda a URL em caso de falha da API; repetir a publicação
            // não faz um segundo upload do mesmo vídeo.
            setUploadedVideo({ file: videoFile, url });
          }
          // O Express atual aceita apenas texto, não um campo de mídia.
          // Registramos a URL permanente no material textual já existente.
          base.texto += `\n\nVídeo PRO: ${url}`;
        }
        setStage('Publicando conteúdo PRO…');
        await withVisibleLoading(() => createConteudoPro(session, base));
        setSuccess(session.demo && videoFile
          ? 'Conteúdo PRO criado na demonstração. A prévia do vídeo era local; nenhum arquivo foi enviado ao servidor.'
          : 'Conteúdo PRO publicado com sucesso!');
      } else {
        setStage('Publicando conteúdo…');
        await withVisibleLoading(() => createConteudo(session, base));
        setSuccess('Conteúdo publicado com sucesso!');
      }
      setTitulo(''); setDescricao(''); setTexto(''); setDuracao('5');
      setFile(null); setVideoFile(null); setUploadedVideo(null);
      setTimeout(() => router.push('/moderadora/painel'), 1200);
    } catch (err) {
      setError(err.message || 'Não foi possível publicar. Tente novamente.');
    } finally {
      setSaving(false); setStage('');
    }
  }

  return <Shell form>
    <Panel title="Criar Conteúdo" className="form-panel">
      <div className="content-mode-switch" role="tablist" aria-label="Tipo de conteúdo">
        <button type="button" role="tab" aria-selected={!isPro} aria-controls="content-editor" className={`content-mode-tab${!isPro ? ' content-mode-tab--active' : ''}`} onClick={() => switchMode('normal')} disabled={saving}>
          <FileText size={17} aria-hidden="true" /> Conteúdo normal
        </button>
        <button type="button" role="tab" aria-selected={isPro} aria-controls="content-editor" className={`content-mode-tab${isPro ? ' content-mode-tab--active' : ''}`} onClick={() => switchMode('pro')} disabled={saving}>
          <Crown size={17} aria-hidden="true" /> Conteúdo PRO
        </button>
      </div>
      <form id="content-editor" role="tabpanel" onSubmit={handleSubmit}>
        {isPro && <p className="content-pro-tip">Conteúdo exclusivo para assinantes PRO. Você pode adicionar um vídeo junto ao material escrito.</p>}
        <div className="form-columns">
          <div className="form-fields">
            <label className="form-label">Título:<input maxLength={255} required value={titulo} onChange={event => setTitulo(event.target.value)} placeholder="Escreva um título" /></label>
            {isPro && <label className="form-label">Descrição:<input required value={descricao} onChange={event => setDescricao(event.target.value)} placeholder="Breve descrição do conteúdo PRO" /></label>}
            <label className="form-label content-label">Conteúdo:<textarea required value={texto} onChange={event => setTexto(event.target.value)} placeholder="Escreva o conteúdo para a comunidade" /></label>
            <label className="duration-label">Duração estimada (minutos): <input type="number" min="1" max="999" required value={duracao} onChange={event => setDuracao(event.target.value)} /></label>
          </div>
          {isPro ? <VideoUploadBox file={videoFile} onFile={chooseVideo} disabled={saving} /> : <UploadBox file={file} onFile={setFile} />}
        </div>
        {isPro && <p className="pro-upload-notice">{session?.demo
          ? 'Modo demonstração: o arquivo selecionado será apenas visualizado localmente.'
          : isVideoUploadConfigured()
            ? 'O vídeo será enviado ao Cloudinary ao publicar. A URL fica salva no conteúdo PRO; atenção: links Cloudinary unsigned geralmente são públicos, mesmo que o conteúdo seja PRO.'
            : 'Para enviar vídeos reais, configure o armazenamento Cloudinary no .env.local. Sem vídeo, a publicação PRO em texto já funciona.'}</p>}
        <Notice message={error} /><Notice message={success} type="success" />
        <GradientButton type="submit" disabled={saving} className="submit-floating">{saving ? 'Publicando…' : isPro ? 'Publicar PRO' : 'Publicar'}</GradientButton>
      </form>
    </Panel>
    {saving && <AstroLoader variant="overlay" label={stage || 'Publicando conteúdo…'} />}
  </Shell>;
}
