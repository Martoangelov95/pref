import { redis } from '@/lib/redis';
import { CACHE_KEYS, TTL } from '@/lib/cache-keys';
import type { PreferredStock, QuantumFundamentals, PriceSnapshot, CommonStockHealth } from '@/types/stock';
import { calculateYTC, calculateYTCApprox, getCallStatus } from '@/lib/calculators/ytc';
import { TICKER_LIST } from '@/lib/data/tickers';

/**
 * Merge fundamentals + price + common health into a full PreferredStock object
 * and persist it to Redis.
 */
export async function buildAndSaveStock(
  fundamentals: QuantumFundamentals,
  price: PriceSnapshot | null,
  commonHealth: CommonStockHealth | null
): Promise<PreferredStock> {
  const stock = mergeStockData(fundamentals, price, commonHealth);
  await redis.set(CACHE_KEYS.stockData(stock.ticker), JSON.stringify(stock), { ex: TTL.stockData });
  return stock;
}

export function mergeStockData(
  fundamentals: QuantumFundamentals,
  price: PriceSnapshot | null,
  commonHealth: CommonStockHealth | null
): PreferredStock {
  const currentPrice = price?.currentPrice ?? 0;
  const previousClose = price?.previousClose ?? 0;
  const priceChange = currentPrice - previousClose;
  const priceChangePct = previousClose > 0 ? (priceChange / previousClose) * 100 : 0;

  const callDate = fundamentals.callDate ? new Date(fundamentals.callDate) : null;
  const { status: callStatus, yearsToCall } = getCallStatus(
    callDate,
    currentPrice,
    fundamentals.callPrice
  );

  // YTC calculation
  let ytc: number | null = null;
  let ytcPercent: string | null = null;
  let ytcApprox: number | null = null;
  let isPricedToCall = false;
  let isAlreadyCallable = false;

  const annualDividend = fundamentals.annualDividend || fundamentals.couponRate * fundamentals.parValue;

  if (currentPrice > 0 && annualDividend > 0 && fundamentals.callPrice > 0) {
    if (yearsToCall !== null) {
      const ytcResult = calculateYTC({
        currentPrice,
        callPrice: fundamentals.callPrice,
        annualDividend,
        yearsToCall: yearsToCall,
      });
      ytc = ytcResult.ytc;
      ytcPercent = ytcResult.ytcPercent;
      isPricedToCall = ytcResult.isPricedToCall;
      isAlreadyCallable = ytcResult.isAlreadyCallable;

      if (yearsToCall > 0) {
        ytcApprox = calculateYTCApprox({
          currentPrice,
          callPrice: fundamentals.callPrice,
          annualDividend,
          yearsToCall,
        });
      }
    } else {
      // Non-callable — use current yield as the relevant metric
      isAlreadyCallable = false;
    }
  }

  const currentYield = currentPrice > 0 ? annualDividend / currentPrice : 0;
  const currentYieldPercent = (currentYield * 100).toFixed(2) + '%';

  return {
    ticker: fundamentals.ticker,
    issuerName: fundamentals.issuerName,
    commonTicker: fundamentals.commonTicker,
    cusip: fundamentals.cusip,
    sector: fundamentals.sector,
    description: fundamentals.description,

    currentPrice,
    previousClose,
    priceChange,
    priceChangePct,

    annualDividend,
    couponRate: fundamentals.couponRate,
    currentYield,
    currentYieldPercent,
    parValue: fundamentals.parValue,
    callPrice: fundamentals.callPrice,
    callDate: fundamentals.callDate,
    callStatus: callStatus ?? 'non-callable',
    yearsToCall,
    ytc,
    ytcPercent,
    isPricedToCall,
    isAlreadyCallable,

    spRating: fundamentals.spRating,
    moodysRating: fundamentals.moodysRating,
    isInvestmentGrade: fundamentals.isInvestmentGrade,
    dividendType: fundamentals.dividendType,
    isFixedRate: fundamentals.isFixedRate,

    volume: price?.volume ?? 0,
    avgVolume30Day: price?.avgVolume30Day ?? 0,
    fiftyTwoWeekHigh: price?.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: price?.fiftyTwoWeekLow ?? 0,

    commonPrice52wChange: commonHealth?.price52wChange ?? null,
    debtToEquity: commonHealth?.debtToEquity ?? null,
    returnOnEquity: commonHealth?.returnOnEquity ?? null,
    freeCashflow: commonHealth?.freeCashflow ?? null,
    marketCap: commonHealth?.marketCap ?? null,

    lastPriceUpdate: price?.fetchedAt ?? new Date().toISOString(),
    lastFundamentalsUpdate: fundamentals.scrapedAt,
  };
}

export async function getStockData(ticker: string): Promise<PreferredStock | null> {
  try {
    const raw = await redis.get<string>(CACHE_KEYS.stockData(ticker));
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function saveFundamentals(fundamentals: QuantumFundamentals): Promise<void> {
  await redis.set(
    CACHE_KEYS.stockFundamentals(fundamentals.ticker),
    JSON.stringify(fundamentals),
    { ex: TTL.stockFundamentals }
  );
}

export async function getFundamentals(ticker: string): Promise<QuantumFundamentals | null> {
  try {
    const raw = await redis.get<string>(CACHE_KEYS.stockFundamentals(ticker));
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function savePrice(price: PriceSnapshot): Promise<void> {
  await redis.set(
    CACHE_KEYS.stockPrice(price.ticker),
    JSON.stringify(price),
    { ex: TTL.stockPrice }
  );
}

export async function getPrice(ticker: string): Promise<PriceSnapshot | null> {
  try {
    const raw = await redis.get<string>(CACHE_KEYS.stockPrice(ticker));
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function saveCommonHealth(health: CommonStockHealth): Promise<void> {
  await redis.set(
    CACHE_KEYS.commonHealth(health.commonTicker),
    JSON.stringify(health),
    { ex: TTL.commonHealth }
  );
}

export async function getCommonHealth(commonTicker: string): Promise<CommonStockHealth | null> {
  try {
    const raw = await redis.get<string>(CACHE_KEYS.commonHealth(commonTicker));
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/**
 * Build a minimal QuantumFundamentals stub from Yahoo Finance price data.
 * Used on cold-start so all tickers show up immediately without needing QOL scraping first.
 * Fields unavailable from Yahoo Finance are set to null/unknown defaults.
 * These stubs are overwritten as soon as a real QOL scrape succeeds for that ticker.
 */
export function buildStubFundamentals(
  ticker: string,
  commonTicker: string,
  price: PriceSnapshot
): QuantumFundamentals {
  const parValue = 25; // Correct for 99%+ of exchange-traded preferreds
  const annualDividend = price.trailingAnnualDividendRate || 0;
  const couponRate = annualDividend > 0 ? annualDividend / parValue : 0;

  return {
    ticker,
    issuerName: price.shortName || ticker,
    commonTicker,
    callDate: null,
    callPrice: parValue,
    parValue,
    couponRate,
    annualDividend,
    dividendType: 'unknown',
    spRating: null,
    moodysRating: null,
    isInvestmentGrade: false,
    sector: 'other',
    isFixedRate: true,
    cusip: '',
    description: 'Awaiting QuantumOnline data',
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Retrieve all stocks from Redis. Returns stocks that exist in cache,
 * with minimal stub data for any not yet cached.
 */
export async function getAllStocks(): Promise<PreferredStock[]> {
  const tickers = TICKER_LIST.map(e => e.ticker);
  const stocks: PreferredStock[] = [];

  // Batch fetch all stock keys
  const batchSize = 100;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const keys = batch.map(t => CACHE_KEYS.stockData(t));

    const values = await redis.mget<string[]>(...keys);
    values.forEach((raw, idx) => {
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          stocks.push(parsed as PreferredStock);
        } catch {
          // skip malformed
        }
      }
    });
  }

  return stocks;
}
