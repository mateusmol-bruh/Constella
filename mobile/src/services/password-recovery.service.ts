import { api } from './api';
interface Message {
  message: string;
}
export const passwordRecoveryService = {
  async request(email: string) {
    return (await api.post<Message>('/api/auth/forgot-password', { email }))
      .data;
  },
  async verify(email: string, codigo: string) {
    return (
      await api.post<Message>('/api/auth/verify-reset-code', { email, codigo })
    ).data;
  },
  async reset(email: string, codigo: string, novaSenha: string) {
    return (
      await api.post<Message>('/api/auth/reset-password', {
        email,
        codigo,
        novaSenha,
      })
    ).data;
  },
};
