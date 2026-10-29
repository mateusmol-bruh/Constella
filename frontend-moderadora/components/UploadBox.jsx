'use client';
import { useEffect, useRef, useState } from 'react';
import { CloudUpload, X } from 'lucide-react';
export default function UploadBox({ file, onFile }) {
  const input = useRef(null);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="upload-wrap">
      <input
        ref={input}
        className="visually-hidden"
        id="upload-illustration"
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        className="upload-box"
        onClick={() => input.current?.click()}
        aria-label="Selecionar capa"
      >
        {preview ? (
          <img alt="Prévia da capa selecionada" className="uploaded-preview" src={preview} />
        ) : (
          <CloudUpload size={75} strokeWidth={1.5} />
        )}
        {!file && <span className="upload-hint">Selecionar capa</span>}
      </button>
      {file && (
        <div className="file-picked">
          <span title={file.name}>{file.name}</span>
          <button
            type="button"
            onClick={() => {
              onFile(null);
              if (input.current) input.current.value = '';
            }}
            aria-label="Remover anexo"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
