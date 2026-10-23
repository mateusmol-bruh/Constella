import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const tokenKey = 'constella.push.token';
let registeringToken: string | undefined;
let binding: Promise<void> | undefined;
export function pushSupported() { return Platform.OS !== 'web' && Device.isDevice && Constants.executionEnvironment !== 'storeClient'; }
export function pushProjectId() { return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId as string | undefined; }
export async function notificationsModule() {
  if (!pushSupported()) throw new Error('PUSH_BUILD_NECESSARIO');
  return import('expo-notifications');
}
export async function registerPush(requestPermission = false, signal?: AbortSignal) {
  const notifications = await notificationsModule();
  const projectId = pushProjectId();
  if (!projectId) throw new Error('PUSH_NAO_CONFIGURADO');
  if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('conversas', {
    name: 'Conversas e conexões', importance: notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150], lightColor: '#A34FD3',
  });
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) permission = await notifications.requestPermissionsAsync();
  if (!permission.granted) { await unregisterPush().catch(() => undefined); return false; }
  const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
  if (signal?.aborted) return false;
  const previous = await SecureStore.getItemAsync(tokenKey);
  if (previous && previous !== token) await api.delete('/api/notificacoes/dispositivo', { data: { token: previous }, signal });
  if (signal?.aborted) return false;
  registeringToken = token;
  const operation = (async () => {
    await api.put('/api/notificacoes/dispositivo', { token, plataforma: Platform.OS }, { signal });
    await SecureStore.setItemAsync(tokenKey, token);
  })();
  binding = operation;
  try { await operation; } finally { if (binding === operation) binding = undefined; }
  return true;
}
export async function unregisterPush() {
  if (Platform.OS === 'web') return;
  // Um registro em andamento deve concluir antes da revogação, preservando a ordem no servidor.
  await binding?.catch(() => undefined);
  const saved = await SecureStore.getItemAsync(tokenKey);
  const tokens = [...new Set([saved, registeringToken].filter((token): token is string => !!token))];
  for (const token of tokens) await api.delete('/api/notificacoes/dispositivo', { data: { token }, timeout: 5000 });
  await SecureStore.deleteItemAsync(tokenKey);
  registeringToken = undefined;
}
