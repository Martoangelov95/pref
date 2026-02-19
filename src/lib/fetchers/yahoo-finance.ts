import yahooFinance from 'yahoo-finance2';
import type { PriceSnapshot, CommonStockHealth } from '@/types/stock';

/**
 * Fetch current price and market data for a preferred stock ticker.
 * Yahoo Finance uses the same hyphenated format as the exchange (BAC-S, JPM-L).
 * OTC preferreds (BANFP, ZIONP) are passed directly.
 */
export async function fetchPreferredPrice(ticker: string): Promise<PriceSnapshot | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(ticker);

    if (!quote || !quote.regularMarketPrice) {
      return null;
    }

    return {
      ticker,
      currentPrice: quote.regularMarketPrice ?? 0,
      previousClose: quote.regularMarketPreviousClose ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      avgVolume30Day: quote.averageDailyVolume3Month ?? 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
      trailingAnnualDividendRate: quote.trailingAnnualDividendRate ?? 0,
      shortName: quote.shortName ?? quote.longName ?? undefined,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[Yahoo Finance] Failed to fetch ${ticker}:`, err);
    return null;
  }
}

/**
 * Fetch health metrics for the underlying common stock.
 */
export async function fetchCommonStockHealth(commonTicker: string): Promise<CommonStockHealth | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary: any = await yahooFinance.quoteSummary(commonTicker, {
      modules: ['financialData', 'defaultKeyStatistics', 'price'],
    });

    const price = summary?.price;
    const financials = summary?.financialData;
    const keyStats = summary?.defaultKeyStatistics;

    return {
      commonTicker,
      price52wChange: keyStats?.['52WeekChange'] ?? null,
      debtToEquity: financials?.debtToEquity ?? null,
      currentRatio: financials?.currentRatio ?? null,
      returnOnEquity: financials?.returnOnEquity ?? null,
      freeCashflow: financials?.freeCashflow ?? null,
      marketCap: price?.marketCap ?? null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[Yahoo Finance] Failed to fetch common stock ${commonTicker}:`, err);
    return null;
  }
}

/**
 * Fetch prices for multiple tickers in parallel batches.
 */
export async function batchFetchPrices(
  tickers: string[],
  batchSize = 20,
  delayMs = 300
): Promise<Map<string, PriceSnapshot>> {
  const results = new Map<string, PriceSnapshot>();

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(ticker => fetchPreferredPrice(ticker))
    );

    settled.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        results.set(batch[idx], result.value);
      }
    });

    if (i + batchSize < tickers.length && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return results;
}

/**
 * Fetch common stock health for multiple tickers, deduplicating by common ticker.
 */
export async function batchFetchCommonHealth(
  commonTickers: string[],
  batchSize = 10,
  delayMs = 300
): Promise<Map<string, CommonStockHealth>> {
  const unique = [...new Set(commonTickers)];
  const results = new Map<string, CommonStockHealth>();

  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(t => fetchCommonStockHealth(t))
    );

    settled.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        results.set(batch[idx], result.value);
      }
    });

    if (i + batchSize < unique.length && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
