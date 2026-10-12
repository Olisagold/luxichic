import 'server-only';
import { randomInt } from 'node:crypto';
import { deviceRecordIds, rememberDeviceRecord } from '@/lib/auth/device-records';

/**
 * Order identifiers (plan.md → Payment flow). The database enforces that both are unique and never equal;
 * `placeOrder` retries with new ones on a collision.
 */

/** Customer-facing 8-digit transaction reference, used as the bank-transfer narration. */
export const newTransactionReference = () => String(randomInt(10_000_000, 100_000_000));

/** Internal order number, e.g. LXC-482913. */
export const newOrderNumber = () => `LXC-${randomInt(100_000, 1_000_000)}`;

export const isTransactionReference = (v: unknown): v is string => typeof v === 'string' && /^[1-9]\d{7}$/.test(v);

/** Orders placed in this browser (see lib/auth/device-records.ts). */
export const placedOrderIds = () => deviceRecordIds('lx_orders');
export const rememberPlacedOrder = (id: string) => rememberDeviceRecord('lx_orders', id);
