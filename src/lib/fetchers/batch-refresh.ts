import { TICKER_LIST } from '@/lib/data/tickers';
import { scrapeQuantumFundamentals } from '@/lib/fetchers/quantum-online';
import { batchFetchPrices, batchFetchCommonHealth } from '@/lib/fetchers/yahoo-finance';
import {
  buildAndSaveStock,
  saveFundamentals,
  savePrice,
  saveCommonHealth,
  getFundamentals,
  getPrice,
  getCommonHealth,
} from '@/lib/data/stock-store';
import { redis } from '@/lib/redis';
import { CACHE_KEYS, TTL } from '@/lib/cache-keys';

export interface RefreshResult {
  attempted: number;
  pricesUpdated: number;
  failed: string[];
  durationMs: number;
}

/**
 * Refresh price data for all tickers. Runs every 30 min during market hours.
 */
export async function refreshAllPrices(): Promise<RefreshResult> {
  const start = Date.now();
  const tickers = TICKER_LIST.map(e => e.ticker);
  const failed: string[] = [];

  console.log(`[BatchRefresh] Starting price refresh for ${tickers.length} tickers`);

  const priceMap = await batchFetchPrices(tickers, 20, 300);

  // Also fetch common stock health (deduplicated)
  const commonTickers = [...new Set(TICKER_LIST.map(e => e.commonTicker))];
  const commonHealthMap = await batchFetchCommonHealth(commonTickers, 10, 300);

  // Save common health to Redis
  for (const [ct, health] of commonHealthMap.entries()) {
    await saveCommonHealth(health);
  }

  // Merge and save each stock
  let pricesUpdated = 0;
  for (const entry of TICKER_LIST) {
    const price = priceMap.get(entry.ticker) || null;
    if (!price) {
      failed.push(entry.ticker);
      continue;
    }

    await savePrice(price);
    pricesUpdated++;

    // Rebuild the full stock object if fundamentals are in cache
    const fundamentals = await getFundamentals(entry.ticker);
    if (fundamentals) {
      const commonHealth = commonHealthMap.get(entry.commonTicker) || await getCommonHealth(entry.commonTicker);
      await buildAndSaveStock(fundamentals, price, commonHealth);
    }
  }

  await redis.set(CACHE_KEYS.metaLastPriceRefresh, new Date().toISOString(), { ex: TTL.meta });

  const result: RefreshResult = {
    attempted: tickers.length,
    pricesUpdated,
    failed,
    durationMs: Date.now() - start,
  };

  console.log(`[BatchRefresh] Price refresh complete: ${pricesUpdated}/${tickers.length} updated, ${failed.length} failed`);
  return result;
}

/**
 * Refresh fundamentals from QuantumOnline. Runs daily at 2am UTC.
 * Processes in batches with delays to be respectful to the server.
 */
export async function refreshAllFundamentals(): Promise<RefreshResult> {
  const start = Date.now();
  const tickers = TICKER_LIST.map(e => e.ticker);
  const failed: string[] = [];
  let updated = 0;

  console.log(`[BatchRefresh] Starting fundamentals refresh for ${tickers.length} tickers`);

  const BATCH_SIZE = 5;
  const DELAY_MS = 2000; // Be respectful to QuantumOnline

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    for (const ticker of batch) {
      try {
        const fundamentals = await scrapeQuantumFundamentals(ticker);
        if (fundamentals) {
          await saveFundamentals(fundamentals);

          // Rebuild full stock object if price is available
          const price = await getPrice(ticker);
          const commonHealth = await getCommonHealth(fundamentals.commonTicker);
          await buildAndSaveStock(fundamentals, price, commonHealth);
          updated++;
        } else {
          failed.push(ticker);
        }
      } catch (err) {
        console.error(`[BatchRefresh] Error processing ${ticker}:`, err);
        failed.push(ticker);
      }
    }

    if (i + BATCH_SIZE < tickers.length) {
      await sleep(DELAY_MS);
    }

    // Progress log every 50 tickers
    if ((i + BATCH_SIZE) % 50 === 0) {
      console.log(`[BatchRefresh] Progress: ${Math.min(i + BATCH_SIZE, tickers.length)}/${tickers.length}`);
    }
  }

  await redis.set(CACHE_KEYS.metaLastFundamentalsRefresh, new Date().toISOString(), { ex: 25 * 3600 });

  const result: RefreshResult = {
    attempted: tickers.length,
    pricesUpdated: updated,
    failed,
    durationMs: Date.now() - start,
  };

  console.log(`[BatchRefresh] Fundamentals refresh complete: ${updated}/${tickers.length} updated, ${failed.length} failed`);
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
