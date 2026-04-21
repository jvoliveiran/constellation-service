import { createUnionType, ObjectType, Field } from '@nestjs/graphql';
import { Person } from '../person.types';
import { ValidationErrorResult } from '../../common/graphql/types/validation-error.type';

@ObjectType({ description: 'Returned when a person is created successfully.' })
export class CreatePersonSuccess {
  @Field(() => Person)
  person: Person;
}

export const CreatePersonResult = createUnionType({
  name: 'CreatePersonResult',
  types: () => [CreatePersonSuccess, ValidationErrorResult] as const,
  resolveType(value) {
    if ('person' in value) return CreatePersonSuccess;
    if ('fieldErrors' in value) return ValidationErrorResult;
    return null;
  },
});
