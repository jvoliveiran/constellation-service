import { ObjectType, Field, ID, Directive } from '@nestjs/graphql';

@ObjectType('User', {
  description: 'Federated User entity reference. Owned by user-service.',
})
@Directive('@key(fields: "id")')
export class UserReference {
  @Field(() => ID, { description: 'Unique user identifier.' })
  @Directive('@external')
  id: string;
}
