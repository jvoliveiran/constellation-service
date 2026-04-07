import { isJwtPayload } from './types';

describe('isJwtPayload', () => {
  const validPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    roles: ['admin'],
    permissions: ['person:read', 'person:create'],
  };

  it('returns true for a valid payload', () => {
    expect(isJwtPayload(validPayload)).toBe(true);
  });

  it('returns true when extra fields are present', () => {
    expect(isJwtPayload({ ...validPayload, iat: 1234567890 })).toBe(true);
  });

  it('returns true for empty roles and permissions arrays', () => {
    expect(isJwtPayload({ ...validPayload, roles: [], permissions: [] })).toBe(
      true,
    );
  });

  it('returns false when sub is missing', () => {
    expect(
      isJwtPayload({
        email: 'test@example.com',
        roles: ['admin'],
        permissions: ['person:read'],
      }),
    ).toBe(false);
  });

  it('returns false when email is missing', () => {
    expect(
      isJwtPayload({
        sub: 'user-123',
        roles: ['admin'],
        permissions: ['person:read'],
      }),
    ).toBe(false);
  });

  it('returns false when roles is missing', () => {
    expect(
      isJwtPayload({
        sub: 'user-123',
        email: 'test@example.com',
        permissions: ['person:read'],
      }),
    ).toBe(false);
  });

  it('returns false when permissions is missing', () => {
    expect(
      isJwtPayload({
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['admin'],
      }),
    ).toBe(false);
  });

  it('returns false when sub is not a string', () => {
    expect(isJwtPayload({ ...validPayload, sub: 123 })).toBe(false);
  });

  it('returns false when email is not a string', () => {
    expect(isJwtPayload({ ...validPayload, email: true })).toBe(false);
  });

  it('returns false when roles is not an array', () => {
    expect(isJwtPayload({ ...validPayload, roles: 'admin' })).toBe(false);
  });

  it('returns false when permissions is not an array', () => {
    expect(isJwtPayload({ ...validPayload, permissions: 'read' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isJwtPayload(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isJwtPayload(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isJwtPayload('not-an-object')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isJwtPayload(42)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isJwtPayload({})).toBe(false);
  });
});
