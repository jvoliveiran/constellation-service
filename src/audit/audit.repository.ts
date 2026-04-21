import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEvent } from './types/audit-event.types';
import { AuditLogFilter } from './types/audit-log-filter.types';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: event.action,
        userId: event.userId,
        targetType: event.targetType,
        targetId: event.targetId,
        metadata: event.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        correlationId: event.correlationId,
      },
    });
  }

  async findMany(filter: AuditLogFilter): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filter.userId ? { userId: filter.userId } : {}),
        ...(filter.action ? { action: filter.action } : {}),
        ...(filter.targetType ? { targetType: filter.targetType } : {}),
        ...(filter.dateFrom || filter.dateTo
          ? {
              createdAt: {
                ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
                ...(filter.dateTo ? { lte: filter.dateTo } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filter.first ?? 50,
    });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: date } },
    });
    return result.count;
  }
}
