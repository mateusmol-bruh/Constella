import axios from 'axios';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const apiUrl = configuredUrl?.replace(/\/+$/, '').replace(/\/api$/i, '');
export const api = axios.create({ baseURL: apiUrl, timeout: 15000 });
let currentToken: string | null = null;
let onExpired: (() => void) | undefined;
export function setApiSession(token: string | null) { currentToken = token; }
export function setSessionExpiredHandler(handler?: () => void) { onExpired = handler; }
api.interceptors.request.use(config => {
  if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) throw new Error('API_NAO_CONFIGURADA');
  if (currentToken && !config.url?.startsWith('/api/auth/') && !config.url?.startsWith('/api/publico/')) config.headers.Authorization = `Bearer ${currentToken}`;
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
    if (status === 404) return 'Esta informação não está mais disponível.';
    if (status === 429) return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
    if (status === 503 && error.response.data?.codigo === 'ONBOARDING_MIGRACAO_PENDENTE') return 'A configuração inicial da conta ainda está indisponível. Tente novamente mais tarde.';
    if (status && status >= 500) return 'O servidor não conseguiu concluir a operação. Tente novamente.';
    if (error.response.data?.mensagem && typeof error.response.data.mensagem === 'string') return error.response.data.mensagem;
    if (status === 409) return 'Já existe um registro com esses dados. Confira as informações.';
    return 'Confira os dados informados e tente novamente.';
  }
  if (error instanceof Error && error.message === 'API_NAO_CONFIGURADA') return 'O servidor ainda não está configurado. Tente novamente mais tarde.';
  return 'Não foi possível concluir. Tente novamente.';
}
