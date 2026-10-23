import axios from 'axios';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const apiUrl = configuredUrl?.replace(/\/+$/, '').replace(/\/api$/i, '');
export const api = axios.create({ baseURL: apiUrl, timeout: 15000 });
let currentToken: string | null = null;
let onExpired: (() => void) | undefined;
let logoutCleanup: (() => Promise<void>) | undefined;
export function setLogoutCleanup(callback?: () => Promise<void>) { logoutCleanup = callback; }
export async function cleanupSessionNotifications() { await logoutCleanup?.(); }
const resourceListeners = new Set<() => void>();
export function signalResourceChange() { resourceListeners.forEach(listener => listener()); }
export function subscribeResourceChanges(listener: () => void) { resourceListeners.add(listener); return () => { resourceListeners.delete(listener); }; }
export function imageAuthHeaders() { return currentToken ? { Authorization: `Bearer ${currentToken}` } : undefined; }
export function setApiSession(token: string | null) { currentToken = token; }
export function setSessionExpiredHandler(handler?: () => void) { onExpired = handler; }
api.interceptors.request.use(config => {
  if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) throw new Error('API_NAO_CONFIGURADA');
  if (currentToken && !config.url?.startsWith('/api/auth/') && !config.url?.startsWith('/api/publico/')) config.headers.Authorization = `Bearer ${currentToken}`;
  else config.headers.delete('Authorization');
  return config;
});
api.interceptors.response.use(response => response, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401 && currentToken &&
      error.config?.headers.Authorization === `Bearer ${currentToken}`) onExpired?.();
  return Promise.reject(error);
});
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ mensagem?: string; codigo?: string }>(error)) {
    const status = error.response?.status;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'O servidor demorou para responder. Tente novamente.';
    if (!error.response) return 'Não foi possível conectar. Verifique sua conexão e tente novamente.';
    if (status === 401) return 'Sessão expirada ou credenciais inválidas. Entre novamente.';
    if (status === 403) return error.response.data?.mensagem ?? 'Você não tem permissão para acessar este recurso.';
    if (status === 404 && error.config?.url?.startsWith('/api/publico/')) return 'O acesso público ainda não está disponível no servidor. Entre com sua conta ou tente novamente mais tarde.';
    if (status === 404) return 'Esta informação não está mais disponível.';
    if (status === 429) return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
    if (status === 503 && error.response.data?.codigo === 'ONBOARDING_MIGRACAO_PENDENTE') return 'A configuração inicial da conta ainda está indisponível. Tente novamente mais tarde.';
    if (status && status >= 500) return 'O servidor não conseguiu concluir a operação. Tente novamente.';
    if (error.response.data?.mensagem && typeof error.response.data.mensagem === 'string') return error.response.data.mensagem;
    if (status === 409) return 'Já existe um registro com esses dados. Confira as informações.';
    return 'Confira os dados informados e tente novamente.';
  }
  if (error instanceof Error && error.message === 'API_NAO_CONFIGURADA') return 'O servidor ainda não está configurado. Tente novamente mais tarde.';
  if (error instanceof Error && error.message === 'IMAGEM_MUITO_GRANDE') return 'A imagem precisa ter até 2 MB. Escolha uma foto menor ou recorte a imagem.';
  if (error instanceof Error && error.message === 'IMAGEM_INVALIDA') return 'Não foi possível ler essa imagem. Escolha outra foto.';
  if (error instanceof Error && error.message === 'CAMERA_SEM_PERMISSAO') return 'Permita o acesso à câmera nas configurações do celular para tirar uma foto.';
  if (error instanceof Error && error.message === 'CAMERA_INDISPONIVEL') return 'Não foi possível abrir a câmera. Tente novamente ou escolha uma foto da galeria.';
  if (error instanceof Error && ['PUSH_NAO_CONFIGURADO', 'PUSH_BUILD_NECESSARIO'].includes(error.message)) return 'As notificações precisam de uma versão do aplicativo configurada para este aparelho.';
  if (error instanceof Error && error.message === 'IMAGEM_RESPOSTA_INVALIDA') return 'O servidor não confirmou o envio da imagem. Tente novamente.';
  return 'Não foi possível concluir. Tente novamente.';
}
