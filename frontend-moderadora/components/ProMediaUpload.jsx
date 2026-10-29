'use client';
import { useEffect, useRef, useState } from 'react';
import { mediaUrl, uploadProFile, createUploadId } from '@/lib/api';
export default function ProMediaUpload({
  kind,
  value,
  onChange,
  onPending,
  disabled = false,
}) {
  const [selection, setSelection] = useState(null),
    [preview, setPreview] = useState(''),
    [progress, setProgress] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const abort = useRef(),
    attempt = useRef(),
    mounted = useRef(true),
    input = useRef();
  const video = kind === 'video',
    label = video ? 'Vídeo exclusivo' : 'Imagem exclusiva';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!selection) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(selection);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selection]);
  async function send(file, key) {
    if (busy) return;
    setBusy(true);
    setError('');
    setProgress(0);
    onPending(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const saved = await uploadProFile(
        file,
        key,
        setProgress,
        controller.signal,
      );
      if (mounted.current) {
        onChange(saved);
        setSelection(null);
        onPending(false);
      }
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function choose(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (
      !(video
        ? file.type === 'video/mp4'
        : ['image/jpeg', 'image/png'].includes(file.type)) ||
      file.size > (video ? 50 : 2) * 1024 * 1024
    ) {
      setError(
        video
          ? 'Selecione MP4 de até 50 MB, H.264 e áudio AAC.'
          : 'Selecione JPG ou PNG de até 2 MB.',
      );
      return;
    }
    const key = createUploadId();
    attempt.current = key;
    setSelection(file);
    void send(file, key);
  }
  function remove() {
    if (busy) return;
    setSelection(null);
    setError('');
    onChange(null);
    onPending(false);
  }
  const src = preview || mediaUrl(value?.url);
  return (
    <section className="private-media" aria-label={label}>
      <h3>{label}</h3>
      <p>
        {video
          ? 'MP4 · H.264/AAC · até 50 MB · 4K · 60 min'
          : 'JPG ou PNG · até 2 MB · 20 megapixels'}
      </p>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        aria-label={'Selecionar ' + label.toLowerCase()}
        accept={
          video ? 'video/mp4,.mp4' : 'image/jpeg,image/png,.jpg,.jpeg,.png'
        }
        onChange={choose}
        disabled={disabled || busy}
      />
      {src &&
        (video ? (
          <video
            key={src}
            src={src}
            controls
            playsInline
            preload="metadata"
            aria-label={'Prévia do ' + label.toLowerCase()}
          />
        ) : (
          <img src={src} alt="Prévia da imagem exclusiva" />
        ))}
      {(selection || value) && (
        <p className="file-name">{selection?.name || value?.nome}</p>
      )}
      {busy && (
        <div role="status">
          <progress
            value={progress}
            max="100"
            aria-label={'Progresso de ' + label.toLowerCase()}
          />
          <span>
            {progress === 100 ? 'Validando arquivo…' : progress + '% enviado'}
          </span>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="media-actions">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => input.current?.click()}
        >
          {src ? 'Substituir' : 'Selecionar'} {video ? 'vídeo' : 'imagem'}
        </button>
        {(selection || value) && (
          <button type="button" disabled={disabled || busy} onClick={remove}>
            Remover {video ? 'vídeo' : 'imagem'}
          </button>
        )}
        {error && selection && (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void send(selection, attempt.current)}
          >
            Tentar envio novamente
          </button>
        )}
      </div>
    </section>
  );
}
