export const CACHE_KEYS = {
  stockData: (ticker: string) => `stock:data:${ticker}`,
  stockPrice: (ticker: string) => `stock:price:${ticker}`,
  stockFundamentals: (ticker: string) => `stock:fundamentals:${ticker}`,
  commonHealth: (commonTicker: string) => `stock:common:${commonTicker}`,
  stockIndex: 'stock:index',
  ideaLatest: (ticker: string) => `idea:${ticker}:latest`,
  ideasRecent: 'ideas:recent',
  metaLastPriceRefresh: 'meta:last_price_refresh',
  metaLastFundamentalsRefresh: 'meta:last_fundamentals_refresh',
  metaLastAIRefresh: 'meta:last_ai_refresh',
} as const;

export const TTL = {
  stockData: 4 * 60 * 60,        // 4 hours
  stockPrice: 35 * 60,           // 35 minutes
  stockFundamentals: 25 * 60 * 60, // 25 hours
  commonHealth: 6 * 60 * 60,     // 6 hours
  stockIndex: 60 * 60,           // 1 hour
  idea: 24 * 60 * 60,            // 24 hours
  ideasRecent: 6 * 60 * 60,      // 6 hours
  meta: 60 * 60,                 // 1 hour
} as const;
