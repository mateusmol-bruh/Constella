// Upload direto do navegador para Cloudinary. Não exige alterações no Express.
// IMPORTANTE: URLs geradas por presets unsigned geralmente são públicas e
// NÃO constituem controle de acesso à assinatura PRO.
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export function videoError(file) {
  if (!file) return '';
  const extension = file.name?.toLowerCase().split('.').pop();
  if (!VIDEO_TYPES.has(file.type) && !['mp4', 'webm', 'mov'].includes(extension)) {
    return 'Selecione um vídeo MP4, WebM ou MOV.';
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return 'O vídeo deve ter no máximo 100 MB.';
  }
  if (!file.size) return 'O arquivo de vídeo está vazio.';
  return '';
}

export function isVideoUploadConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
    && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim());
}

export async function uploadProVideo(file) {
  const validation = videoError(file);
  if (validation) throw new Error(validation);

  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloud || !preset) {
    throw new Error('Upload de vídeo não configurado. Defina NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET no .env.local do front-end.');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cloud)) {
    throw new Error('Nome do Cloudinary inválido na configuração do front-end.');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', preset);

  let response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/video/upload`, {
      method: 'POST', body: form,
    });
  } catch {
    throw new Error('Não foi possível enviar o vídeo. Verifique sua conexão e tente novamente.');
  }
  let result = {};
  try { result = await response.json(); } catch { /* Erro sem JSON */ }
  if (!response.ok) {
    const detail = result.error?.message;
    throw new Error(detail ? `Erro no envio do vídeo: ${detail}` : `Erro no envio do vídeo (${response.status}).`);
  }
  if (!result.secure_url?.startsWith(`https://res.cloudinary.com/${cloud}/video/upload/`)) {
    throw new Error('A plataforma de vídeos não retornou uma URL de vídeo válida.');
  }
  return result.secure_url;
}
