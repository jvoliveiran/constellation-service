import { REQUIRE_PERMISSIONS_KEY } from './require-permissions.decorator';

describe('RequirePermissions', () => {
  it('exports the correct metadata key', () => {
    expect(REQUIRE_PERMISSIONS_KEY).toBe('requirePermissions');
  });
});
