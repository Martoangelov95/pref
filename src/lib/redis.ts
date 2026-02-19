import { Redis } from '@upstash/redis';

let redis: Redis;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  // Mock redis for development without Redis configured
  redis = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    keys: async () => [],
    mget: async () => [],
    pipeline: () => ({
      set: () => ({}),
      exec: async () => [],
    }),
  } as unknown as Redis;
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[Redis] UPSTASH_REDIS_REST_URL not set — using mock Redis (no persistence)');
  }
}

export { redis };
