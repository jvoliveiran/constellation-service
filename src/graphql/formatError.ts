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

  // Handle both string and array messages
  const errorMessage = Array.isArray(originalError.message)
    ? originalError.message[0]
    : originalError.message;

  return {
    message: `${originalError.error} (${originalError.statusCode}): ${errorMessage}`,
    extensions,
  };
};
