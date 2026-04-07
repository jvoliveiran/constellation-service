import { maskEmail } from './mask-email';

describe('maskEmail', () => {
  it('masks a standard email address', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
  });

  it('masks a single-character local part', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
  });

  it('returns *** for an invalid email without @', () => {
    expect(maskEmail('noemail')).toBe('***');
  });

  it('returns *** for an empty string', () => {
    expect(maskEmail('')).toBe('***');
  });

  it('masks a long local part showing only the first character', () => {
    expect(maskEmail('longusername@domain.io')).toBe('l***@domain.io');
  });
});
