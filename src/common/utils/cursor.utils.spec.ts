import { BadRequestException } from '@nestjs/common';
import { encodeCursor, decodeCursor } from './cursor.utils';

describe('cursor.utils', () => {
  describe('encodeCursor / decodeCursor round-trip', () => {
    it('round-trips with a string ID', () => {
      const createdAt = new Date('2026-01-15T10:30:00.000Z');
      const id = 'abc-123';

      const cursor = encodeCursor(createdAt, id);
      const decoded = decodeCursor(cursor);

      expect(decoded.createdAt.toISOString()).toBe(createdAt.toISOString());
      expect(decoded.id).toBe(id);
    });

    it('round-trips with an integer ID', () => {
      const createdAt = new Date('2026-03-20T14:00:00.000Z');
      const id = 42;

      const cursor = encodeCursor(createdAt, id);
      const decoded = decodeCursor(cursor);

      expect(decoded.createdAt.toISOString()).toBe(createdAt.toISOString());
      expect(decoded.id).toBe(id);
    });

    it('produces a base64url-encoded string', () => {
      const cursor = encodeCursor(new Date(), 1);

      // base64url uses only alphanumeric, hyphen, underscore, no padding
      expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('decodeCursor error handling', () => {
    it('throws BadRequestException for a completely invalid string', () => {
      expect(() => decodeCursor('not-a-cursor')).toThrow(BadRequestException);
    });

    it('throws BadRequestException for valid base64 but invalid JSON', () => {
      const invalidBase64 = Buffer.from('not json').toString('base64url');
      expect(() => decodeCursor(invalidBase64)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when createdAt is missing', () => {
      const payload = Buffer.from(JSON.stringify({ id: '1' })).toString(
        'base64url',
      );
      expect(() => decodeCursor(payload)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when id is missing', () => {
      const payload = Buffer.from(
        JSON.stringify({ createdAt: new Date().toISOString() }),
      ).toString('base64url');
      expect(() => decodeCursor(payload)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when createdAt is an invalid date', () => {
      const payload = Buffer.from(
        JSON.stringify({ createdAt: 'not-a-date', id: 1 }),
      ).toString('base64url');
      expect(() => decodeCursor(payload)).toThrow(BadRequestException);
    });

    it('throws BadRequestException when payload is an array', () => {
      const payload = Buffer.from(JSON.stringify([1, 2, 3])).toString(
        'base64url',
      );
      expect(() => decodeCursor(payload)).toThrow(BadRequestException);
    });
  });
});
