export const AUDIT_ACTIONS = [
  'PERSON_CREATED',
  'PERSON_UPDATED',
  'PERSON_DELETED',
  'AUTH_LOGIN',
  'AUTH_LOGOUT',
  'AUTH_TOKEN_REVOKED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
