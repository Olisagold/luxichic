function randomDigits(length: number): string {
  let out = String(Math.floor(Math.random() * 9) + 1);
  while (out.length < length) out += String(Math.floor(Math.random() * 10));
  return out;
}

/**
 * PROTOTYPE ONLY — generates a random eight-digit transaction reference and
 * checks it against existing references. The backend must guarantee uniqueness.
 */
export function generateTransactionReference(existing: string[]): string {
  let ref = randomDigits(8);
  while (existing.includes(ref)) ref = randomDigits(8);
  return ref;
}

export function generateOrderNumber(existing: string[]): string {
  let num = `LXC-${randomDigits(6)}`;
  while (existing.includes(num)) num = `LXC-${randomDigits(6)}`;
  return num;
}

export function generateAppointmentReference(existing: string[]): string {
  let ref = `APT-${randomDigits(6)}`;
  while (existing.includes(ref)) ref = `APT-${randomDigits(6)}`;
  return ref;
}

export function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 32; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
