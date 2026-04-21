import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockCacheManager: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('retrieves a stored value by key', async () => {
      const expectedValue = { name: 'test', age: 25 };
      mockCacheManager.get.mockResolvedValue(expectedValue);

      const result = await cacheService.get<typeof expectedValue>('user:1');

      expect(result).toEqual(expectedValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith('user:1');
    });

    it('returns undefined on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await cacheService.get('nonexistent-key');

      expect(result).toBeUndefined();
      expect(mockCacheManager.get).toHaveBeenCalledWith('nonexistent-key');
    });
  });

  describe('set', () => {
    it('stores a value with the default TTL', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await cacheService.set('user:1', { name: 'test' });

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'user:1',
        { name: 'test' },
        undefined,
      );
    });

    it('stores a value with a custom TTL', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await cacheService.set('user:1', { name: 'test' }, 5000);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'user:1',
        { name: 'test' },
        5000,
      );
    });
  });

  describe('del', () => {
    it('removes a value by key', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await cacheService.del('user:1');

      expect(mockCacheManager.del).toHaveBeenCalledWith('user:1');
    });
  });
});
