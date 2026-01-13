import { DirectiveLocation, GraphQLDirective } from 'graphql';

export const PublicDirective = new GraphQLDirective({
  name: 'public',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  description:
    'Marks a field or type as publicly accessible without authentication',
});

export const PrivateDirective = new GraphQLDirective({
  name: 'private',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  description:
    'Marks a field or type as requiring authentication (default behavior)',
});
