import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Person')
@Directive('@key(fields: "id")')
export class Person {
  @Field(() => Int, { nullable: false })
  id: number;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Int, { nullable: false })
  age: number;
}
