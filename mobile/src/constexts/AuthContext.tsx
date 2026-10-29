import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authService, type RegisterInput } from '../services/auth.service';
import { communityService } from '../services/community.service';
import { cleanupSessionNotifications, revokeCurrentSession, errorMessage, setApiSession, setSessionExpiredHandler } from '../services/api';
import type { AuthResponse, AuthUser, Profile } from '../types/models';

interface AuthState {
  user: AuthUser | null; isGuest: boolean; restoring: boolean; notice: string;
  needsOnboarding: boolean | null; about: string; setAbout: (text: string) => void;
  login: (email: string, senha: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  enterGuest: () => Promise<void>; logout: () => Promise<void>;
  finishOnboarding: (interesses: string[]) => Promise<void>;
  retryAccount: () => Promise<void>;
  restoreFailed: boolean; retrySession: () => Promise<void>;
}
const AuthContext = createContext<AuthState | undefined>(undefined);
const sessionKey = 'constella.session';
const storage = {
  async read() { return Platform.OS === 'web' ? null : SecureStore.getItemAsync(sessionKey); },
  async save(token: string) { if (Platform.OS !== 'web') await SecureStore.setItemAsync(sessionKey, token); },
  async clear() { if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(sessionKey); },
};
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState('');
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [about, setAbout] = useState('');
  const [restoreFailed, setRestoreFailed] = useState(false);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const storageQueue = useRef(Promise.resolve());
  function current(version: number) { return mounted.current && version === epoch.current; }
  // Uma exclusão da sessão anterior deve terminar antes de salvar a próxima.
  function updateStorage(operation: () => Promise<void>) {
    const pending = storageQueue.current.then(operation);
    // Recupera somente a fila; a falha original de pending segue para o chamador.
    storageQueue.current = pending.then(() => undefined, () => undefined);
    return pending;
  }
  function applyProfile(profile: Profile) {
    setNeedsOnboarding(typeof profile.onboarding_concluido === 'boolean' ? !profile.onboarding_concluido : null);
    setAbout(profile.onboarding_concluido ? profile.apresentacao ?? '' : '');
    setUser({ id: profile.id, nome: profile.nome, email: profile.email, onboarding_concluido: profile.onboarding_concluido });
  }
  async function restoreSession() {
    const version = ++epoch.current;
    setRestoring(true); setRestoreFailed(false); setNotice('');
    try {
      const token = await storage.read();
      if (!current(version)) return;
      setApiSession(token);
      if (token) {
        const profile = await communityService.profile();
        if (current(version)) applyProfile(profile);
      }
    } catch (error) {
      if (current(version)) { setRestoreFailed(true); setNotice(errorMessage(error)); }
    } finally { if (current(version)) setRestoring(false); }
  }
  useEffect(() => {
    mounted.current = true;
    setSessionExpiredHandler((message) => {
      const version = ++epoch.current;
      setApiSession(null); setUser(null); setIsGuest(false); setAbout(''); setNeedsOnboarding(null);
      setRestoring(false); setRestoreFailed(false);
      setNotice(message || 'Sua sessão expirou. Entre novamente.');
      void updateStorage(storage.clear).catch(() => {
        if (current(version)) setNotice('Entre novamente para renovar sua sessão.');
      });
    });
    void Promise.resolve().then(() => { if (mounted.current) return restoreSession(); });
    return () => { mounted.current = false; epoch.current++; setSessionExpiredHandler(undefined); };
  }, []);
  async function accept(result: AuthResponse, version: number) {
    if (!current(version)) throw new Error('Sessão alterada.');
    if (typeof result.token !== 'string' || !result.token || !result.usuaria?.id) throw new Error('Resposta de autenticação inválida.');
    await updateStorage(async () => { if (current(version)) await storage.save(result.token); });
    if (!current(version)) throw new Error('Sessão alterada.');
    setApiSession(result.token); setNotice(''); setIsGuest(false);
    setRestoring(false); setRestoreFailed(false);
    const completed = result.usuaria.onboarding_concluido;
    setNeedsOnboarding(typeof completed === 'boolean' ? !completed : null);
    setAbout(completed ? result.usuaria.apresentacao ?? '' : '');
    setUser(result.usuaria);
  }
  async function authenticate(request: () => Promise<AuthResponse>) {
    const version = ++epoch.current;
    // Respostas privadas da conta anterior não podem expirar esta tentativa.
    setApiSession(null); setRestoring(false);
    setUser(null); setIsGuest(false); setAbout(''); setNeedsOnboarding(null);
    setRestoreFailed(false); setNotice('');
    await updateStorage(storage.clear);
    if (!current(version)) throw new Error('Sessão alterada.');
    await accept(await request(), version);
  }
  async function logout() {
    const version = ++epoch.current;
    const revocation = revokeCurrentSession();
    // Revoga o dispositivo ainda com o JWT desta conta. Falha de rede não retém a sessão local.
    try { await cleanupSessionNotifications(); } catch { /* Será sincronizado no próximo login. */ }
    try { await updateStorage(storage.clear); }
    catch { if (current(version)) setNotice('Não foi possível sair com segurança. Tente novamente.'); return; }
    const revoked=await revocation;
    if (!current(version)) return;
    setApiSession(null); setUser(null); setIsGuest(false); setAbout(''); setNeedsOnboarding(null); setNotice(revoked ? '' : 'Você saiu deste aparelho. Não foi possível confirmar o encerramento da sessão no servidor.');
    setRestoring(false); setRestoreFailed(false);
  }
  async function retryAccount() {
    const version = ++epoch.current;
    setRestoring(true); setNotice('');
    try {
      const profile = await communityService.profile();
      if (current(version)) {
        applyProfile(profile);
        if (profile.onboarding_concluido === null) setNotice('A configuração da conta ainda não está disponível. Tente novamente mais tarde.');
      }
    } catch (error) { if (current(version)) setNotice(errorMessage(error)); }
    finally { if (current(version)) setRestoring(false); }
  }
  async function finishOnboarding(interesses: string[]) {
    if (!user || isGuest) throw new Error('Entre com sua conta para continuar.');
    const version = epoch.current;
    const profile = await authService.completeOnboarding({ interesses, apresentacao: about });
    if (!current(version)) throw new Error('Sessão alterada.');
    if (profile.onboarding_concluido !== true) throw new Error('Conclusão não confirmada pelo servidor.');
    applyProfile(profile);
  }
  async function enterGuest() {
    const version = ++epoch.current;
    setApiSession(null); setUser(null); setIsGuest(false); setAbout(''); setNeedsOnboarding(null);
    setRestoring(false); setRestoreFailed(false); setNotice('');
    await updateStorage(storage.clear);
    if (!current(version)) throw new Error('Sessão alterada.');
    setIsGuest(true);
  }
  return <AuthContext.Provider value={{
    user, isGuest, restoring, notice, needsOnboarding, about, setAbout,
    login: (email, senha) => authenticate(() => authService.login(email, senha)),
    register: input => authenticate(() => authService.register(input)),
    enterGuest, logout, finishOnboarding, retryAccount, restoreFailed, retrySession: restoreSession,
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider ausente.');
  return context;
}
