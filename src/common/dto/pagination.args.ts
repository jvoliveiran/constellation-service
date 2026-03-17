import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Min, Max, IsOptional } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @Min(0)
  @Max(10000)
  skip: number = 0;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  take: number = 20;
}
