import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';
import { CursorPaginated } from '../common/dto/cursor-paginated-response.factory';

@ObjectType('Person')
@Directive('@key(fields: "id")')
export class Person {
  @Field(() => Int, { nullable: false })
  id: number;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => Int, { nullable: false })
  age: number;

  @Field(() => Date, { nullable: false })
  createdAt: Date;
}

@ObjectType()
export class CursorPaginatedPersonResponse extends CursorPaginated(Person) {}
