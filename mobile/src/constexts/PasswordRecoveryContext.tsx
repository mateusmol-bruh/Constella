import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { recoveryCooldown } from '../utils/password-recovery';
export type RecoveryStackParams = {
  Solicitar: undefined;
  Verificar: undefined;
  NovaSenha: undefined;
};
export type RecoveryProps<K extends keyof RecoveryStackParams> =
  NativeStackScreenProps<RecoveryStackParams, K>;
interface RecoveryState {
  email: string;
  codigo: string;
  lastRequest: number;
  requested: (email: string) => void;
  verified: (code: string) => void;
  login: () => void;
  success: () => void;
}
export const PasswordRecoveryContext = createContext<RecoveryState | undefined>(
  undefined,
);
export function usePasswordRecovery() {
  const value = useContext(PasswordRecoveryContext);
  if (!value) throw new Error('Fluxo de recuperação indisponível.');
  return value;
}
export function useRecoveryWait() {
  const { lastRequest } = usePasswordRecovery(),
    [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [lastRequest]);
  return recoveryCooldown(lastRequest, now ?? lastRequest);
}
export function useRecoveryActive() {
  const active = useRef(false);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, []),
  );
  return active;
}
