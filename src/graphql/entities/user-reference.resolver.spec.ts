import { UserReferenceResolver } from './user-reference.resolver';

describe('UserReferenceResolver', () => {
  let resolver: UserReferenceResolver;
  let logger: { debug: jest.Mock };

  beforeEach(() => {
    logger = { debug: jest.fn() };
    resolver = new UserReferenceResolver(logger as never);
  });

  describe('resolveReference', () => {
    it('returns the user reference with the correct id', () => {
      const reference = { __typename: 'User', id: 'user-456' };

      const result = resolver.resolveReference(reference);

      expect(result).toEqual({ id: 'user-456' });
    });

    it('logs the reference resolution at debug level', () => {
      const reference = { __typename: 'User', id: 'user-789' };

      resolver.resolveReference(reference);

      expect(logger.debug).toHaveBeenCalledWith(
        'Resolving User entity reference',
        expect.objectContaining({ userId: 'user-789' }),
      );
    });
  });
});
