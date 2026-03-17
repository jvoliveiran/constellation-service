import { Directive, Field, Int, ObjectType } from '@nestjs/graphql';
import { Paginated } from '../common/dto/paginated-response.factory';

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

@ObjectType()
export class PaginatedPersonResponse extends Paginated(Person) {}
