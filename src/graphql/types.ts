export type GraphQLErrorExtensions = {
  message: string[];
  error: string;
  statusCode: number;
};

export type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
};

export function isJwtPayload(value: unknown): value is JwtPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sub' in value &&
    typeof (value as Record<string, unknown>).sub === 'string' &&
    'email' in value &&
    typeof (value as Record<string, unknown>).email === 'string' &&
    'roles' in value &&
    Array.isArray((value as Record<string, unknown>).roles) &&
    'permissions' in value &&
    Array.isArray((value as Record<string, unknown>).permissions)
  );
}
