import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, Min } from 'class-validator';

@InputType()
export class CreatePersonInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field(() => Int)
  @IsNotEmpty()
  @Min(1)
  age: number;
}
