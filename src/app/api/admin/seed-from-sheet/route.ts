import { NextResponse } from 'next/server';
import {
  saveFundamentals,
  getPrice,
  getCommonHealth,
  buildAndSaveStock,
} from '@/lib/data/stock-store';
import { COMMON_TICKER_MAP } from '@/lib/data/tickers';
import type { QuantumFundamentals, PreferredSector, DividendType } from '@/types/stock';

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
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuote = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parsePrice(s: string): number | null {
  const clean = s.replace(/\$/, '').replace(/,/g, '').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function parsePct(s: string): number | null {
  const clean = s.replace(/%/, '').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : n / 100;
}

function parseDate(s: string): string | null {
  s = s.trim();
  if (!s || /^(none|n\/a)$/i.test(s)) return null;
  const parts = s.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts.map(Number);
    const year = y < 100 ? 2000 + y : y;
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function mapSector(s: string): PreferredSector {
  const lower = s.toLowerCase().trim();
  if (lower.includes('mreit') || lower.includes('mortgage')) return 'reit-mortgage';
  if (lower === 'reit' || lower.includes('reit')) return 'reit-equity';
  if (lower === 'bank' || lower === 'banks') return 'bank';
  if (lower === 'insurance') return 'insurance';
  if (lower === 'bdc') return 'bdc';
  if (lower === 'ute' || lower === 'utility' || lower === 'utilities') return 'utility';
  if (lower === 'energy') return 'energy';
  if (lower === 'telecom') return 'telecom';
  if (lower === 'industrial') return 'industrial';
  return 'other';
}

export async function GET() {
  try {
    const resp = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
    if (!resp.ok) {
      return NextResponse.json({ error: `Failed to fetch sheet: ${resp.status}` }, { status: 502 });
    }
    const text = await resp.text();
    const rows = parseCsv(text);

    // Row 0 is the header, data starts at row 1
    const dataRows = rows.slice(1);

    let seeded = 0;
    let rebuilt = 0;
    const failed: string[] = [];
    const skipped: string[] = [];

    for (const row of dataRows) {
      if (row.length < 18) continue;

      const ticker = row[7]?.trim();
      if (!ticker) continue;

      const currentPriceRaw = row[9]?.trim() ?? '';
      // Skip redeemed/float rows
      if (/^(redeem|redeemed|float)$/i.test(currentPriceRaw)) {
        skipped.push(ticker);
        continue;
      }

      try {
        const quarterlyDiv = row[16]?.trim().startsWith('$')
          ? parsePrice(row[16])
          : null;
        const annualDividend = quarterlyDiv != null ? Math.round(quarterlyDiv * 4 * 10000) / 10000 : 0;

        const couponRate = parsePct(row[8]) ?? 0;
        const parValue = 25;

        const cumRaw = row[2]?.trim().toLowerCase();
        let dividendType: DividendType = 'unknown';
        if (cumRaw === 'yes') dividendType = 'cumulative';
        else if (cumRaw === 'no') dividendType = 'non-cumulative';

        const fixFloatRaw = row[5]?.trim().toLowerCase() ?? '';
        const isFixedRate = fixFloatRaw.startsWith('fix') && !fixFloatRaw.includes('fix-float');

        const igRaw = row[13]?.trim().toUpperCase();
        const isInvestmentGrade = igRaw === 'Y';

        const spRaw = row[14]?.trim();
        const spRating = !spRaw || spRaw === 'NR' ? null : spRaw;
        const moodysRaw = row[15]?.trim();
        const moodysRating = !moodysRaw || moodysRaw === 'NR' ? null : moodysRaw;

        const callDate = parseDate(row[17]);
        const commonTicker = COMMON_TICKER_MAP[ticker] ?? ticker.split('-')[0];

        const fundamentals: QuantumFundamentals = {
          ticker,
          issuerName: row[1]?.trim() ?? ticker,
          commonTicker,
          callDate,
          callPrice: parValue,
          parValue,
          couponRate,
          annualDividend: annualDividend || (couponRate * parValue),
          dividendType,
          spRating,
          moodysRating,
          isInvestmentGrade,
          sector: mapSector(row[4] ?? ''),
          isFixedRate,
          cusip: '',
          description: `${row[6]?.trim() ?? ''} preferred / baby bond`,
          scrapedAt: new Date().toISOString(),
        };

        await saveFundamentals(fundamentals);
        seeded++;

        // Rebuild full stock object if price already exists
        const price = await getPrice(ticker);
        if (price) {
          const commonHealth = await getCommonHealth(commonTicker);
          await buildAndSaveStock(fundamentals, price, commonHealth);
          rebuilt++;
        }
      } catch (err) {
        console.error(`[SeedFromSheet] Error processing ${ticker}:`, err);
        failed.push(ticker);
      }
    }

    return NextResponse.json({
      ok: true,
      seeded,
      rebuilt,
      skipped: skipped.length,
      failed,
    });
  } catch (err) {
    console.error('[SeedFromSheet] Fatal error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
