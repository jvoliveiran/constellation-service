export type AuditLogFilter = {
  userId?: string;
  action?: string;
  targetType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  first?: number;
};
