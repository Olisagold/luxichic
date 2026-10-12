export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Accepts Nigerian numbers such as 08012345678 or +2348012345678. */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s-]/g, '');
  return /^(\+?234|0)[789][01]\d{8}$/.test(digits);
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const s = Math.min(score, 4) as PasswordStrength['score'];
  return { score: s, label: labels[s] };
}

export function passwordError(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (!/\d/.test(pw) || !/[A-Za-z]/.test(pw)) return 'Include both letters and numbers.';
  return null;
}

export const validatePassword = passwordError;

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
