import { BadRequestException } from '@nestjs/common';
import { DecodedCursor } from '../types/decoded-cursor.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function encodeCursor(createdAt: Date, id: string | number): string {
  return Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id }),
  ).toString('base64url');
}

export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed: unknown = JSON.parse(json);

    if (!isRecord(parsed)) {
      throw new Error('Not an object');
    }

    if (typeof parsed.createdAt !== 'string') {
      throw new Error('Missing or invalid createdAt');
    }

    if (typeof parsed.id !== 'string' && typeof parsed.id !== 'number') {
      throw new Error('Missing or invalid id');
    }

    const createdAt = new Date(parsed.createdAt);

    if (isNaN(createdAt.getTime())) {
      throw new Error('Invalid date');
    }

    return { createdAt, id: parsed.id };
  } catch {
    throw new BadRequestException('Invalid pagination cursor.');
  }
}
