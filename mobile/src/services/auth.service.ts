import { api } from './api';
import { communityService } from './community.service';
import type { AuthResponse } from '../types/models';
export interface RegisterInput { nome: string; email: string; senha: string; cpf: string }
export const authService = {
  async login(email: string, senha: string) {
    return (await api.post<AuthResponse>('/api/auth/login', { email, senha })).data;
  },
  async register(input: RegisterInput) {
    return (await api.post<AuthResponse>('/api/auth/cadastro', input)).data;
  },
  async completeOnboarding(dados: { apresentacao: string; interesses: string[] }) {
    await api.put('/api/perfil/onboarding', dados);
    return communityService.profile();
  },
};
