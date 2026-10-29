'use client';

import { useEffect, useRef, useState } from 'react';
import { Film, UploadCloud, X } from 'lucide-react';
import { MAX_VIDEO_BYTES, videoError } from '@/lib/video';

export default function VideoUploadBox({ file, onFile, disabled = false }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) { setPreviewUrl(''); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function chooseFile(event) {
    const selection = event.target.files?.[0] || null;
    const message = videoError(selection);
    setError(message);
    onFile(message ? null : selection);
    if (message && inputRef.current) inputRef.current.value = '';
  }

  function removeFile() {
    onFile(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <section className="pro-video-section" aria-label="Vídeo do conteúdo PRO">
      <div className="pro-video-header"><Film size={18} aria-hidden="true" /> <strong>Vídeo do conteúdo PRO</strong></div>
      <p className="pro-video-description">Selecione um vídeo para anexar ao conteúdo PRO. MP4, WebM ou MOV, até {MAX_VIDEO_BYTES / 1024 / 1024} MB.</p>
      <input ref={inputRef} type="file" id="pro-video-input" className="visually-hidden" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={chooseFile} disabled={disabled} />
      {previewUrl ? (
        <div className="pro-video-selected">
          <video key={previewUrl} className="pro-video-preview" src={previewUrl} controls playsInline preload="metadata" aria-label="Prévia do vídeo selecionado">Seu navegador não suporta prévia de vídeo.</video>
          <div className="pro-video-file">
            <span title={file.name}>{file.name} <small>({(file.size / 1024 / 1024).toFixed(1)} MB)</small></span>
            <button type="button" onClick={removeFile} disabled={disabled} aria-label="Remover vídeo"><X size={18} /></button>
          </div>
        </div>
      ) : (
        <button type="button" className="pro-video-pick" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <UploadCloud size={42} strokeWidth={1.4} aria-hidden="true" />
          <span>Selecionar vídeo</span>
          <small>Visualize antes de publicar</small>
        </button>
      )}
      {error && <p className="pro-video-error" role="alert">{error}</p>}
      {!file && <p className="pro-video-optional">Opcional: você também pode publicar conteúdo PRO somente em texto.</p>}
    </section>
  );
}
