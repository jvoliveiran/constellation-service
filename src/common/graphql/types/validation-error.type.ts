import { Field, ObjectType } from '@nestjs/graphql';
import { FieldError } from './field-error.type';

@ObjectType({ description: 'Returned when input validation fails.' })
export class ValidationErrorResult {
  @Field(() => String, { description: 'Summary error message.' })
  message: string;

  @Field(() => [FieldError], { description: 'Per-field validation errors.' })
  fieldErrors: FieldError[];
}
