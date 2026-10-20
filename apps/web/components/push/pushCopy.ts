import type { PushStatus } from '@/hooks/usePush';

/** What to tell someone about notifications on this device. */
export function pushCopy(status: PushStatus, app: 'LUXICHIC' | 'LUXICHIC Admin'): string {
  switch (status) {
    case 'checking':
      return 'Checking this device…';
    case 'install':
      return `On iPhone and iPad, notifications only work from the app: tap Share, then “Add to Home Screen”, open ${app} from your Home Screen and turn them on there.`;
    case 'unsupported':
      return 'This browser can’t show notifications. Use Chrome, or add the site to your Home Screen.';
    case 'blocked':
      return 'Notifications are blocked for this site. Allow them in your browser or phone settings, then come back here.';
    case 'on':
      return 'Notifications are on for this device.';
    default:
      return 'Get a notification on this phone or computer, even when the site is closed.';
  }
}
