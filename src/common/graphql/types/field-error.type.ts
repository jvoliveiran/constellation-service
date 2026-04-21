import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A validation error on a specific input field.' })
export class FieldError {
  @Field(() => String, {
    description: 'The input field that failed validation.',
  })
  field: string;

  @Field(() => String, { description: 'Human-readable error message.' })
  message: string;
}
