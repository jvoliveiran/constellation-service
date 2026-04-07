import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Min, Max, IsOptional, IsString } from 'class-validator';

@ArgsType()
export class CursorPaginationArgs {
  @Field(() => Int, {
    defaultValue: 20,
    description: 'Number of items to return. Min 1, max 100.',
  })
  @IsOptional()
  @Min(1)
  @Max(100)
  first: number = 20;

  @Field(() => String, {
    nullable: true,
    defaultValue: null,
    description:
      'Opaque cursor. Pass the endCursor from a previous response to fetch the next page.',
  })
  @IsOptional()
  @IsString()
  after: string | null = null;
}
