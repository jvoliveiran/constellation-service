export function parseCorsOrigins(originsString: string | undefined): string[] {
  if (!originsString || originsString.trim() === '') return [];
  return originsString
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function validateCorsOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
