import 'server-only';
import { cookies } from 'next/headers';

/**
 * Records (orders, appointments) created in this browser, kept as their random UUIDs in an httpOnly cookie.
 * Their confirmation pages only show them to their account or to the browser that created them; UUIDs can't be
 * guessed, so holding one is proof enough.
 */
const MAX_REMEMBERED = 20;
const UUID = /^[0-9a-f-]{36}$/;

export type DeviceRecord = 'lx_orders' | 'lx_appointments';

export async function deviceRecordIds(name: DeviceRecord): Promise<string[]> {
  const raw = (await cookies()).get(name)?.value ?? '';
  return raw.split('.').filter((id) => UUID.test(id));
}

export async function rememberDeviceRecord(name: DeviceRecord, id: string): Promise<void> {
  const ids = [id, ...(await deviceRecordIds(name)).filter((x) => x !== id)].slice(0, MAX_REMEMBERED);
  (await cookies()).set(name, ids.join('.'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
}
