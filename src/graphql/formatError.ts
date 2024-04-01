import { UserInputError } from '@nestjs/apollo';
import {
  GraphQLError,
  GraphQLFormattedError,
  GraphQLErrorExtensions,
} from 'graphql';

type GQLError = GraphQLError | UserInputError;

export const formatError = (err: GQLError): GraphQLFormattedError => {
  const { extensions } = err;
  const originalError =
    (extensions?.originalError as GraphQLErrorExtensions) ?? {
      error: 'Server error',
      statusCode: 500,
      message: ['Server internal error'],
    };
  return {
    message: `${originalError.error} (${originalError.statusCode}): ${originalError.message[0]}`,
    extensions,
  };
};
