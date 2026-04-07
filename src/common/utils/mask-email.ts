export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visibleChars = Math.min(local.length, 1);
  return `${local.slice(0, visibleChars)}***@${domain}`;
}
