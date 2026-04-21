import { parseCorsOrigins, validateCorsOrigin } from './cors.utils';

describe('parseCorsOrigins', () => {
  it('splits a comma-separated string into trimmed origins', () => {
    const result = parseCorsOrigins(
      'https://app.example.com, https://admin.example.com',
    );
    expect(result).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  it('returns an empty array for undefined input', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
  });

  it('returns an empty array for empty string', () => {
    expect(parseCorsOrigins('')).toEqual([]);
  });

  it('returns an empty array for whitespace-only string', () => {
    expect(parseCorsOrigins('   ')).toEqual([]);
  });

  it('filters out empty segments from trailing commas', () => {
    const result = parseCorsOrigins('https://app.example.com,,');
    expect(result).toEqual(['https://app.example.com']);
  });
});

describe('validateCorsOrigin', () => {
  it('accepts an https URL', () => {
    expect(validateCorsOrigin('https://app.example.com')).toBe(true);
  });

  it('accepts an http URL', () => {
    expect(validateCorsOrigin('http://localhost:3000')).toBe(true);
  });

  it('rejects an ftp URL', () => {
    expect(validateCorsOrigin('ftp://files.example.com')).toBe(false);
  });

  it('rejects a plain string that is not a URL', () => {
    expect(validateCorsOrigin('not-a-url')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validateCorsOrigin('')).toBe(false);
  });
});
