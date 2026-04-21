import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('AuditLog', {
  description:
    'An immutable record of a sensitive action performed in the system.',
})
export class AuditLogType {
  @Field(() => Int, { nullable: false })
  id: number;

  @Field(() => String, {
    nullable: false,
    description: 'The action that was performed (e.g. PERSON_CREATED).',
  })
  action: string;

  @Field(() => String, {
    nullable: true,
    description: 'The user who performed the action.',
  })
  userId: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'The type of entity targeted by the action.',
  })
  targetType: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'The identifier of the targeted entity.',
  })
  targetId: string | null;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional context about the action.',
  })
  metadata: Prisma.JsonValue | null;

  @Field(() => String, { nullable: true })
  ipAddress: string | null;

  @Field(() => String, { nullable: true })
  userAgent: string | null;

  @Field(() => String, { nullable: true })
  correlationId: string | null;

  @Field(() => Date, { nullable: false })
  createdAt: Date;
}

@InputType({ description: 'Filters for querying audit log entries.' })
export class AuditLogFilterInput {
  @Field(() => String, { nullable: true, description: 'Filter by user ID.' })
  userId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by action name.',
  })
  action?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by target entity type.',
  })
  targetType?: string;

  @Field(() => Date, {
    nullable: true,
    description: 'Start of the date range (inclusive).',
  })
  dateFrom?: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'End of the date range (inclusive).',
  })
  dateTo?: Date;

  @Field(() => Int, {
    nullable: true,
    description: 'Maximum number of entries to return. Defaults to 50.',
  })
  first?: number;
}
