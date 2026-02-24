import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { CACHE_KEYS, TTL } from '@/lib/cache-keys';
import { buildAndSaveStock, getCommonHealth } from '@/lib/data/stock-store';
import { COMMON_TICKER_MAP } from '@/lib/data/tickers';
import type { QuantumFundamentals, PriceSnapshot, PreferredSector, DividendType } from '@/types/stock';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/12XvzMGmOcyzPSV5EeyPl9FIhZ0234mjWndC05PRUBFU/export?format=csv&gid=0';

/** Parse a CSV string into rows of string arrays, handling quoted fields. */
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
      } else {
        field += ch;
      }
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

function parsePrice(s: string): number | null {
  const n = parseFloat(s.replace(/\$/, '').replace(/,/g, '').trim());
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
  const lower = s.toLowerCase().trim();
  if (lower.includes('mreit') || lower.includes('mortgage')) return 'reit-mortgage';
  if (lower.includes('reit')) return 'reit-equity';
  if (lower === 'bank' || lower === 'banks') return 'bank';
  if (lower === 'insurance') return 'insurance';
  if (lower === 'bdc') return 'bdc';
  if (lower === 'ute' || lower.includes('util')) return 'utility';
  if (lower === 'energy') return 'energy';
  if (lower === 'telecom') return 'telecom';
  if (lower === 'industrial') return 'industrial';
  return 'other';
}

export async function GET() {
  try {
    // ── 1. Fetch & parse the sheet ──────────────────────────────────────────
    const resp = await fetch(SHEET_CSV_URL, { cache: 'no-store', redirect: 'follow' });
    if (!resp.ok) {
      return NextResponse.json({ error: `Failed to fetch sheet: ${resp.status}` }, { status: 502 });
    }
    const text = await resp.text();

    // Detect HTML response (e.g. Google login page after redirect)
    if (text.trimStart().startsWith('<')) {
      return NextResponse.json(
        { error: 'Google Sheets returned HTML instead of CSV. Ensure the spreadsheet is shared publicly (Anyone with the link → Viewer).' },
        { status: 502 }
      );
    }

    const rows = parseCsv(text);
    const dataRows = rows.slice(1); // skip header row

    // ── 2. Parse all rows into QuantumFundamentals (no Redis yet) ───────────
    const fundamentalsList: QuantumFundamentals[] = [];
    const skipped: string[] = [];

    for (const row of dataRows) {
      if (row.length < 18) continue;

      const ticker = row[7]?.trim();
      if (!ticker) continue;

      const priceRaw = row[9]?.trim() ?? '';
      if (/^(redeem|redeemed|float)$/i.test(priceRaw)) {
        skipped.push(ticker);
        continue;
      }

      const quarterlyDiv = row[16]?.trim().startsWith('$') ? parsePrice(row[16]) : null;
      const annualDividend = quarterlyDiv != null ? Math.round(quarterlyDiv * 4 * 10000) / 10000 : 0;
      const couponRate = parsePct(row[8]) ?? 0;
      const parValue = 25;

      const cumRaw = row[2]?.trim().toLowerCase();
      const dividendType: DividendType =
        cumRaw === 'yes' ? 'cumulative' : cumRaw === 'no' ? 'non-cumulative' : 'unknown';

      const fixFloatRaw = row[5]?.trim().toLowerCase() ?? '';
      const isFixedRate = fixFloatRaw.startsWith('fix') && !fixFloatRaw.includes('fix-float');

      const spRaw = row[14]?.trim();
      const moodysRaw = row[15]?.trim();
      const commonTicker = COMMON_TICKER_MAP[ticker] ?? ticker.split('-')[0];

      fundamentalsList.push({
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
        description: `${row[6]?.trim() ?? ''} preferred / baby bond`,
        scrapedAt: new Date().toISOString(),
      });
    }

    // ── 3. Batch-save all fundamentals via pipeline (100 per HTTP call) ─────
    const CHUNK = 100;
    for (let i = 0; i < fundamentalsList.length; i += CHUNK) {
      const chunk = fundamentalsList.slice(i, i + CHUNK);
      const pipe = redis.pipeline();
      for (const f of chunk) {
        pipe.set(CACHE_KEYS.stockFundamentals(f.ticker), JSON.stringify(f), { ex: TTL.stockFundamentals });
      }
      await pipe.exec();
    }

    // ── 4. Batch-read all prices in one mget ─────────────────────────────────
    const tickers = fundamentalsList.map(f => f.ticker);
    const priceKeys = tickers.map(t => CACHE_KEYS.stockPrice(t));
    const priceValues = await redis.mget<string[]>(...priceKeys);

    // ── 5. Rebuild stock objects where prices already exist ──────────────────
    let rebuilt = 0;
    for (let i = 0; i < fundamentalsList.length; i++) {
      const raw = priceValues[i];
      if (!raw) continue;
      try {
        const price: PriceSnapshot = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const f = fundamentalsList[i];
        const commonHealth = await getCommonHealth(f.commonTicker);
        await buildAndSaveStock(f, price, commonHealth);
        rebuilt++;
      } catch {
        // skip malformed price entry
      }
    }

    return NextResponse.json({
      ok: true,
      seeded: fundamentalsList.length,
      rebuilt,
      skipped: skipped.length,
    });
  } catch (err) {
    console.error('[SeedFromSheet] Fatal error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
