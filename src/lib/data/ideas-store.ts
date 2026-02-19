import { redis } from '@/lib/redis';
import { CACHE_KEYS, TTL } from '@/lib/cache-keys';
import type { TradeIdea, BatchScreenerIdea } from '@/types/ai';

export async function saveTradeIdea(idea: TradeIdea): Promise<void> {
  await redis.set(
    CACHE_KEYS.ideaLatest(idea.ticker),
    JSON.stringify(idea),
    { ex: TTL.idea }
  );

  // Also add to recent ideas sorted set (score = timestamp)
  // Redis sorted set: zadd key score member
  await redis.zadd(CACHE_KEYS.ideasRecent, {
    score: Date.now(),
    member: idea.ticker,
  });
}

export async function getTradeIdea(ticker: string): Promise<TradeIdea | null> {
  try {
    const raw = await redis.get<string>(CACHE_KEYS.ideaLatest(ticker));
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function getRecentIdeas(limit = 20): Promise<TradeIdea[]> {
  try {
    // Get most recent tickers (highest scores = most recent)
    const tickers = await redis.zrange(CACHE_KEYS.ideasRecent, 0, limit - 1, { rev: true });
    if (!tickers || tickers.length === 0) return [];

    const ideas: TradeIdea[] = [];
    for (const ticker of tickers) {
      const idea = await getTradeIdea(ticker as string);
      if (idea) ideas.push(idea);
    }
    return ideas;
  } catch {
    return [];
  }
}

export async function saveBatchScreenerIdeas(ideas: BatchScreenerIdea[]): Promise<void> {
  await redis.set(
    'ideas:batch:latest',
    JSON.stringify(ideas),
    { ex: TTL.idea }
  );
}

export async function getBatchScreenerIdeas(): Promise<BatchScreenerIdea[]> {
  try {
    const raw = await redis.get<string>('ideas:batch:latest');
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}
