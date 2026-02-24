import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { CACHE_KEYS, TTL } from '@/lib/cache-keys';
import { mergeStockData } from '@/lib/data/stock-store';
import { COMMON_TICKER_MAP } from '@/lib/data/tickers';
import type {
  QuantumFundamentals,
  PriceSnapshot,
  PreferredSector,
  DividendType,
} from '@/types/stock';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/12XvzMGmOcyzPSV5EeyPl9FIhZ0234mjWndC05PRUBFU/export?format=csv&gid=0';

// ── CSV parser ──────────────────────────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── Field parsers ────────────────────────────────────────────────────────────
function parseDollar(s: string): number | null {
  // Handles "$26.13", "-$0.21", "$0.62"
  const n = parseFloat(s.replace(/\$/g, '').replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}

function parsePct(s: string): number | null {
  const n = parseFloat(s.replace(/%/, '').trim());
  return isNaN(n) ? null : n / 100;
}

function parseDate(s: string): string | null {
  s = s.trim();
  if (!s || /^(none|n\/a)$/i.test(s)) return null;
  const parts = s.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts.map(Number);
    return `${y < 100 ? 2000 + y : y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function mapSector(s: string): PreferredSector {
  const l = s.toLowerCase().trim();
  if (l.includes('mreit') || l.includes('mortgage')) return 'reit-mortgage';
  if (l.includes('reit')) return 'reit-equity';
  if (l === 'bank' || l === 'banks') return 'bank';
  if (l === 'insurance') return 'insurance';
  if (l === 'bdc') return 'bdc';
  if (l === 'ute' || l.includes('util')) return 'utility';
  if (l === 'energy') return 'energy';
  if (l === 'telecom') return 'telecom';
  if (l === 'industrial') return 'industrial';
  return 'other';
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Fetch the sheet
    const resp = await fetch(SHEET_CSV_URL, { cache: 'no-store', redirect: 'follow' });
    if (!resp.ok) {
      return NextResponse.json({ error: `Sheet fetch failed: ${resp.status}` }, { status: 502 });
    }
    const text = await resp.text();
    if (text.trimStart().startsWith('<')) {
      return NextResponse.json(
        { error: 'Google Sheets returned HTML — make sure the sheet is shared publicly (Anyone with link → Viewer).' },
        { status: 502 }
      );
    }

    const rows = parseCsv(text);
    const dataRows = rows.slice(1); // row 0 is the header

    // 2. Parse every row into (fundamentals, price) pairs — all in memory
    type StockPair = { fundamentals: QuantumFundamentals; price: PriceSnapshot };
    const pairs: StockPair[] = [];
    const skipped: string[] = [];

    const now = new Date().toISOString();

    for (const row of dataRows) {
      if (row.length < 18) continue;

      const ticker = row[7]?.trim();
      if (!ticker) continue;

      // Skip redeemed / floating rows
      const priceRaw = row[9]?.trim() ?? '';
      if (/^(redeem|redeemed|float)$/i.test(priceRaw) || !priceRaw) {
        skipped.push(ticker);
        continue;
      }

      const currentPrice = parseDollar(priceRaw);
      if (currentPrice === null || currentPrice <= 0) {
        skipped.push(ticker);
        continue;
      }

      // Price change → derive previous close
      const changeRaw = row[10]?.trim() ?? '';
      const change = parseDollar(changeRaw) ?? 0;
      const previousClose = Math.max(0, currentPrice - change);

      // Quarterly dividend → annual
      const quarterlyDiv = row[16]?.trim().startsWith('$') ? parseDollar(row[16]) : null;
      const annualDividend = quarterlyDiv != null
        ? Math.round(quarterlyDiv * 4 * 10000) / 10000
        : 0;

      const couponRate = parsePct(row[8]) ?? 0;
      const parValue = 25;

      const cum = row[2]?.trim().toLowerCase();
      const dividendType: DividendType =
        cum === 'yes' ? 'cumulative' : cum === 'no' ? 'non-cumulative' : 'unknown';

      const fixFloat = row[5]?.trim().toLowerCase() ?? '';
      const isFixedRate = fixFloat.startsWith('fix') && !fixFloat.includes('fix-float');

      const spRaw = row[14]?.trim();
      const moodysRaw = row[15]?.trim();
      const commonTicker = COMMON_TICKER_MAP[ticker] ?? ticker.split('-')[0];

      const fundamentals: QuantumFundamentals = {
        ticker,
        issuerName: row[1]?.trim() ?? ticker,
        commonTicker,
        callDate: parseDate(row[17]),
        callPrice: parValue,
        parValue,
        couponRate,
        annualDividend: annualDividend || couponRate * parValue,
        dividendType,
        spRating: !spRaw || spRaw === 'NR' ? null : spRaw,
        moodysRating: !moodysRaw || moodysRaw === 'NR' ? null : moodysRaw,
        isInvestmentGrade: row[13]?.trim().toUpperCase() === 'Y',
        sector: mapSector(row[4] ?? ''),
        isFixedRate,
        cusip: '',
        description: `${row[6]?.trim() ?? ''} — ${row[1]?.trim() ?? ticker}`,
        scrapedAt: now,
      };

      const price: PriceSnapshot = {
        ticker,
        currentPrice,
        previousClose,
        volume: 0,
        avgVolume30Day: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        trailingAnnualDividendRate: annualDividend || couponRate * parValue,
        shortName: row[1]?.trim() ?? ticker,
        fetchedAt: now,
      };

      pairs.push({ fundamentals, price });
    }

    // 3. Build all stock objects in memory using pure mergeStockData
    const stockJsons = pairs.map(({ fundamentals, price }) => ({
      ticker: fundamentals.ticker,
      fundamentalsJson: JSON.stringify(fundamentals),
      priceJson: JSON.stringify(price),
      stockJson: JSON.stringify(mergeStockData(fundamentals, price, null)),
    }));

    // 4. Pipeline-save all three key types in chunks of 100
    const CHUNK = 100;
    for (let i = 0; i < stockJsons.length; i += CHUNK) {
      const chunk = stockJsons.slice(i, i + CHUNK);
      const pipe = redis.pipeline();
      for (const { ticker, fundamentalsJson, priceJson, stockJson } of chunk) {
        pipe.set(CACHE_KEYS.stockFundamentals(ticker), fundamentalsJson, { ex: TTL.stockFundamentals });
        pipe.set(CACHE_KEYS.stockPrice(ticker), priceJson, { ex: TTL.stockPrice });
        pipe.set(CACHE_KEYS.stockData(ticker), stockJson, { ex: TTL.stockData });
      }
      await pipe.exec();
    }

    // 5. Update the "last price refresh" meta so the dashboard banner shows a timestamp
    await redis.set(CACHE_KEYS.metaLastPriceRefresh, now, { ex: TTL.meta });

    return NextResponse.json({
      ok: true,
      seeded: stockJsons.length,
      skipped: skipped.length,
    });
  } catch (err) {
    console.error('[SeedFromSheet] Fatal:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
