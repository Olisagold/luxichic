import { describe, expect, it } from 'vitest';
import { isUuid, isValidEmail, isValidPhone, passwordError } from '@/lib/utils/validation';

describe('form checks', () => {
  it('emails', () => {
    expect(['ada@example.com', 'a.b+c@mail.luxichic.online'].every(isValidEmail)).toBe(true);
    expect(['ada', 'ada@', '@x.com', 'a b@x.com'].some(isValidEmail)).toBe(false);
  });

  it('Nigerian phone numbers', () => {
    expect(['08012345678', '+2348012345678', '0803 000 0000'].every(isValidPhone)).toBe(true);
    expect(['123', 'phone', ''].some(isValidPhone)).toBe(false);
  });

  it('passwords need 8 characters with a letter and a number', () => {
    expect(passwordError('Guest-Test-pw1')).toBeNull();
    expect(passwordError('short1')).not.toBeNull();
    expect(passwordError('nonumbershere')).not.toBeNull();
  });

  it('ids', () => {
    expect(isUuid('aeaafd8d-ec35-4b15-bc99-676e2851b3b3')).toBe(true);
    expect(isUuid('LXC-123456')).toBe(false);
  });
});
