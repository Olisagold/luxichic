'use client';

import { useCallback, useEffect, useState } from 'react';
import { deletePushSubscription, savePushSubscription, sendTestPush, type PushAudience } from '@/lib/push/actions';

/**
 * Phone notifications for this device:
 * - `unsupported`: the browser can't do web push;
 * - `install`: an iPhone/iPad browser tab — iOS only allows notifications from the app added to the Home Screen;
 * - `blocked`: notifications were refused in the browser or phone settings;
 * - `off` / `on`.
 */
export type PushStatus = 'checking' | 'unsupported' | 'install' | 'blocked' | 'off' | 'on';

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) ?? navigator.serviceWorker.register('/sw.js');
}

export function usePush(audience: PushAudience) {
  const [status, setStatus] = useState<PushStatus>('checking');
  const [busy, setBusy] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!KEY || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return setStatus(isIos() && !isInstalled() ? 'install' : 'unsupported');
    }
    if (isIos() && !isInstalled()) return setStatus('install');
    if (Notification.permission === 'denied') return setStatus('blocked');
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    setEndpoint(sub?.endpoint ?? null);
    setStatus(sub && Notification.permission === 'granted' ? 'on' : 'off');
  }, []);

  useEffect(() => {
    check().catch(() => setStatus('unsupported'));
  }, [check]);

  /** Asks permission (must follow a tap), subscribes this device and saves it on the server. */
  const enable = async (): Promise<string | null> => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'blocked' : 'off');
        return 'Notifications weren’t allowed.';
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const res = await savePushSubscription(sub.toJSON(), audience);
      if (!res.ok) return res.error ?? 'Could not turn notifications on.';
      setEndpoint(sub.endpoint);
      setStatus('on');
      return null;
    } catch {
      return 'This browser couldn’t turn notifications on. Try again, or use Chrome or the installed app.';
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint, audience);
        await sub.unsubscribe();
      }
      setEndpoint(null);
      setStatus('off');
    } finally {
      setBusy(false);
    }
  };

  const test = async () =>
    endpoint ? sendTestPush(endpoint, audience) : { ok: false, error: 'Turn notifications on first.' };

  return { status, busy, enable, disable, test };
}
