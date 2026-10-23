import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import type { PushDestination } from '../utils/notifications';
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
let pending: PushDestination | undefined;
let opener: ((target: PushDestination) => Promise<boolean>) | undefined;
let opening = false;
const handled = new Set<string>();
export function setNotificationOpener(callback?: typeof opener) { opener = callback; }
export function queueNotification(target: PushDestination) {
  if (handled.has(target.evento)) return;
  pending = target;
  void flushNotificationNavigation();
}
export async function flushNotificationNavigation() {
  if (pending && handled.has(pending.evento)) pending = undefined;
  if (opening || !pending || !opener || !navigationRef.isReady()) return;
  opening = true;
  const target = pending;
  const callback = opener;
  try {
    if (await callback(target)) {
      handled.add(target.evento);
      if (handled.size > 50) handled.delete(handled.values().next().value!);
      if (pending === target) pending = undefined;
    }
  } finally { opening = false; if (pending && callback !== opener) void flushNotificationNavigation(); }
}
