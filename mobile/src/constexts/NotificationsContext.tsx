import React from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { useFeedback } from './FeedbackContext';
import { errorMessage, setLogoutCleanup, signalResourceChange } from '../services/api';
import { notificationsModule, pushProjectId, pushSupported, registerPush, unregisterPush } from '../services/notifications.service';
import { flushNotificationNavigation, navigationRef, queueNotification, setNotificationOpener } from '../services/notifications-navigation';
import { socialService } from '../services/social.service';
import { pushDestination } from '../utils/notifications';

interface State { enabled: boolean; busy: boolean; error: string; available: boolean; enable: () => Promise<void> }
const Context = React.createContext<State | null>(null);
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <AccountNotifications key={user?.id ?? 'guest'}>{children}</AccountNotifications>;
}
function AccountNotifications({ children }: { children: React.ReactNode }) {
  const { user, needsOnboarding } = useAuth();
  const owner = user?.id;
  const notify = useFeedback();
  const [enabled, setEnabled] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const generation = React.useRef(0);
  const running = React.useRef(false);
  const currentRequest = React.useRef<AbortController | undefined>(undefined);
  const available = pushSupported() && !!pushProjectId();
  const sync = React.useCallback(async (ask = false) => {
    if (!owner || running.current) return;
    if (!available) { if (ask) setError('As notificações precisam de uma versão do aplicativo configurada para este aparelho.'); return; }
    const version = ++generation.current;
    const controller = new AbortController(); currentRequest.current = controller;
    running.current = true;
    setBusy(true);
    if (ask) setError('');
    try {
      const active = await registerPush(ask, controller.signal);
      if (generation.current !== version) return;
      setEnabled(active);
      if (active) setError('');
      if (ask) {
        if (active) notify('Notificações ativadas.', 'success');
        else setError('Permita notificações nas configurações do aparelho para receber avisos.');
      }
    } catch (cause) {
      if (generation.current === version) { setEnabled(false); if (ask) setError(errorMessage(cause)); }
    }
    finally { running.current = false; if (generation.current === version) setBusy(false); }
  }, [owner, available, notify]);
  React.useEffect(() => {
    let active = true;
    const subscriptions: { remove: () => void }[] = [];
    const counter = generation, request = currentRequest;
    const startup = setTimeout(() => { void sync(); }, 0);
    if (owner && available) void notificationsModule().then(notifications => {
      if (!active) return;
      notifications.setNotificationHandler({ handleNotification: async notification => {
        const target = pushDestination(notification.request.content.data);
        const route = navigationRef.getCurrentRoute();
        const sameConversation = (target?.tipo === 'chat' && route?.name === 'Chat') || (target?.tipo === 'forum' && route?.name === 'ChatForum');
        const routeId = route?.params && 'id' in route.params ? route.params.id : undefined;
        const show = target?.destinataria === owner && !(sameConversation && routeId === target.id);
        return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
      } });
      const response = notifications.getLastNotificationResponse();
      const initial = response && pushDestination(response.notification.request.content.data);
      if (initial) { queueNotification(initial); notifications.clearLastNotificationResponse(); }
      subscriptions.push({ remove: () => notifications.setNotificationHandler(null) });
      subscriptions.push(notifications.addNotificationReceivedListener(notification => {
        if (pushDestination(notification.request.content.data)?.destinataria === owner) signalResourceChange();
      }));
      subscriptions.push(notifications.addNotificationResponseReceivedListener(result => {
        const target = pushDestination(result.notification.request.content.data);
        if (target) { queueNotification(target); notifications.clearLastNotificationResponse(); }
      }));
      subscriptions.push(notifications.addPushTokenListener(() => { void sync(); }));
    }).catch(() => {});
    subscriptions.push(AppState.addEventListener('change', state => { if (state === 'active') { void sync(); void flushNotificationNavigation(); } }));
    setLogoutCleanup(async () => {
      counter.current++;
      try { await unregisterPush(); } finally { request.current?.abort(); }
    });
    return () => { active = false; counter.current++; request.current?.abort(); clearTimeout(startup); subscriptions.forEach(sub => sub.remove()); setLogoutCleanup(); };
  }, [owner, available, sync]);
  React.useEffect(() => {
    let active = true;
    setNotificationOpener(async target => {
      if (!owner || needsOnboarding !== false) return false;
      if (target.destinataria !== owner) return true;
      try {
        if (target.tipo === 'chat') {
          const chat = await socialService.chat(target.id);
          if (!active) return true;
          navigationRef.navigate('Chat', { id: chat.id_chat, nome: chat.destinataria?.nome ?? 'Conversa', foto: chat.destinataria?.foto });
        } else if (target.tipo === 'forum') {
          const forum = await socialService.forum(target.id);
          if (!active) return true;
          navigationRef.navigate('ChatForum', { id: forum.id_for, nome: forum.titulo });
        } else navigationRef.navigate('Main', { screen: 'Conexoes' });
      } catch (cause) { notify(errorMessage(cause), 'error'); }
      return true;
    });
    void flushNotificationNavigation();
    return () => { active = false; setNotificationOpener(); };
  }, [owner, needsOnboarding, notify]);
  return <Context.Provider value={{ enabled, busy, error, available, enable: () => sync(true) }}>{children}</Context.Provider>;
}
export function useNotifications() {
  const state = React.useContext(Context);
  if (!state) throw new Error('NotificationsProvider ausente');
  return state;
}
