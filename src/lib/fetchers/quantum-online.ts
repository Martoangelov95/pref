import * as cheerio from 'cheerio';
import type { QuantumFundamentals, PreferredSector, DividendType } from '@/types/stock';
import { isInvestmentGrade } from '@/lib/calculators/ytc';

const QOL_BASE = 'https://www.quantumonline.com';

// Session cookie cached in memory for the duration of the process
let _sessionCookie: string | null = null;
let _sessionExpiry = 0;

async function getSession(): Promise<string> {
  if (_sessionCookie && Date.now() < _sessionExpiry) {
    return _sessionCookie;
  }

  const username = process.env.QOL_USERNAME;
  const password = process.env.QOL_PASSWORD;

  if (!username || !password) {
    throw new Error('QOL_USERNAME and QOL_PASSWORD environment variables are required');
  }

  // Step 1: Load the login page to get session cookies
  const loginPageResp = await fetch(`${QOL_BASE}/login.cfm`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  const rawCookie = loginPageResp.headers.get('set-cookie') ?? '';
  const cookies = parseCookies(rawCookie);

  // Step 2: Submit login form
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);
  formData.append('submit', 'Login');

  const loginResp = await fetch(`${QOL_BASE}/login.cfm`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
      'Referer': `${QOL_BASE}/login.cfm`,
    },
    body: formData.toString(),
    redirect: 'follow',
  });

  const postCookie = loginResp.headers.get('set-cookie') ?? '';
  const finalCookies = mergeCookies(cookies, parseCookies(postCookie));

  _sessionCookie = finalCookies;
  _sessionExpiry = Date.now() + 30 * 60 * 1000; // 30 min session
  return _sessionCookie;
}

/**
 * Scrape fundamentals for a single preferred stock ticker from QuantumOnline.
 * Returns null if not found or scraping fails.
 */
export async function scrapeQuantumFundamentals(
  ticker: string
): Promise<QuantumFundamentals | null> {
  try {
    const session = await getSession();

    // QuantumOnline search by ticker symbol
    const searchUrl = `${QOL_BASE}/search.cfm?tickersymbol=${encodeURIComponent(ticker)}&sopt=symbol`;

    const resp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': session,
        'Referer': `${QOL_BASE}/`,
      },
    });

    if (!resp.ok) {
      console.error(`[QOL] HTTP ${resp.status} for ${ticker}`);
      return null;
    }

    const html = await resp.text();
    return parseQuantumPage(html, ticker);
  } catch (err) {
    console.error(`[QOL] Error scraping ${ticker}:`, err);
    return null;
  }
}

function parseQuantumPage(html: string, ticker: string): QuantumFundamentals | null {
  const $ = cheerio.load(html);

  // QuantumOnline security detail pages have a specific table structure
  // The main content is in <table> elements with security details
  // We look for key text patterns and extract neighboring values

  const pageText = $.text();

  // If "no records found" or "not found" patterns, return null
  if (
    pageText.toLowerCase().includes('no records found') ||
    pageText.toLowerCase().includes('symbol not found') ||
    pageText.toLowerCase().includes('no data available')
  ) {
    return null;
  }

  // Extract issuer name - usually in a prominent heading
  let issuerName = '';
  $('h1, h2, .company-name, b').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 100 && !issuerName) {
      issuerName = text;
    }
  });

  // Helper: find value after a label in table rows
  function findValueAfterLabel(label: string): string {
    let result = '';
    $('td, th').each((_, el) => {
      const text = $(el).text().trim();
      if (text.toLowerCase().includes(label.toLowerCase())) {
        const next = $(el).next('td');
        if (next.length) {
          result = next.text().trim();
          return false; // break
        }
      }
    });
    return result;
  }

  // Also search table rows for key-value pairs
  function findInRows(label: string): string {
    let result = '';
    $('tr').each((_, row) => {
      const cells = $(row).find('td, th');
      cells.each((i, cell) => {
        if ($(cell).text().toLowerCase().includes(label.toLowerCase())) {
          const nextCell = cells.eq(i + 1);
          if (nextCell.length) {
            result = nextCell.text().trim();
            return false;
          }
        }
      });
      if (result) return false;
    });
    return result;
  }

  // Extract key fields
  const callDateStr = findValueAfterLabel('call date') || findInRows('call date') || findInRows('callable');
  const callPriceStr = findValueAfterLabel('call price') || findInRows('call price') || findInRows('redemption');
  const parValueStr = findValueAfterLabel('par value') || findInRows('par value') || findInRows('liquidation');
  const couponRateStr = findValueAfterLabel('dividend rate') || findInRows('dividend rate') || findInRows('coupon') || findInRows('rate:');
  const dividendTypeStr = findValueAfterLabel('cumulative') || findInRows('cumulative') || pageText;
  const spRatingStr = findValueAfterLabel('s&p') || findInRows('s&p') || findValueAfterLabel('standard & poor');
  const moodysRatingStr = findValueAfterLabel("moody") || findInRows("moody");
  const sectorStr = findValueAfterLabel('industry') || findInRows('industry') || findValueAfterLabel('sector') || '';
  const cusipStr = findValueAfterLabel('cusip') || findInRows('cusip') || '';
  const annualDivStr = findValueAfterLabel('annual dividend') || findInRows('annual dividend') || '';
  const issueTypeStr = findValueAfterLabel('issue type') || findInRows('issue type') || findInRows('fixed') || '';

  // Parse numeric values
  const callPrice = parseFloat(callPriceStr.replace(/[^0-9.]/g, '')) || 25.0;
  const parValue = parseFloat(parValueStr.replace(/[^0-9.]/g, '')) || 25.0;

  // Coupon rate: could be "5.75%" or "0.0575"
  let couponRate = 0;
  const couponMatch = couponRateStr.match(/([0-9]+\.?[0-9]*)\s*%/);
  if (couponMatch) {
    couponRate = parseFloat(couponMatch[1]) / 100;
  } else {
    const raw = parseFloat(couponRateStr.replace(/[^0-9.]/g, ''));
    if (raw > 0 && raw < 1) couponRate = raw;
    else if (raw >= 1 && raw <= 30) couponRate = raw / 100;
  }

  // Annual dividend
  let annualDividend = 0;
  const annualDivMatch = annualDivStr.match(/([0-9]+\.?[0-9]*)/);
  if (annualDivMatch) {
    annualDividend = parseFloat(annualDivMatch[1]);
  }
  if (!annualDividend && couponRate && parValue) {
    annualDividend = couponRate * parValue;
  }

  // Call date
  let callDate: string | null = null;
  if (callDateStr && callDateStr.match(/\d{4}/)) {
    try {
      const parsed = new Date(callDateStr);
      if (!isNaN(parsed.getTime())) {
        callDate = parsed.toISOString().split('T')[0];
      }
    } catch {
      callDate = null;
    }
  }

  // Dividend type
  let dividendType: DividendType = 'unknown';
  const dtLower = (dividendTypeStr + issueTypeStr + pageText).toLowerCase();
  if (dtLower.includes('non-cumulative') || dtLower.includes('noncumulative')) {
    dividendType = 'non-cumulative';
  } else if (dtLower.includes('cumulative')) {
    dividendType = 'cumulative';
  }

  // S&P rating — strip extra words
  const spRating = spRatingStr ? cleanRating(spRatingStr) : null;
  const moodysRating = moodysRatingStr ? cleanRating(moodysRatingStr) : null;

  // Sector
  const sector = classifySector(sectorStr, pageText);

  // Fixed rate
  const isFixedRate = !dtLower.includes('float') && !dtLower.includes('variable');

  // Common ticker = root of preferred ticker (stripped)
  const commonTicker = ticker.includes('-') ? ticker.split('-')[0] : ticker.replace(/[A-Z]$/, '');

  return {
    ticker,
    issuerName: issuerName || ticker,
    commonTicker,
    callDate,
    callPrice,
    parValue,
    couponRate,
    annualDividend,
    dividendType,
    spRating,
    moodysRating,
    isInvestmentGrade: isInvestmentGrade(spRating, moodysRating),
    sector,
    isFixedRate,
    cusip: cusipStr.replace(/[^A-Z0-9]/g, ''),
    description: `${issuerName} - ${ticker}`,
    scrapedAt: new Date().toISOString(),
  };
}

function cleanRating(raw: string): string {
  // Extract rating string like "BBB-", "Baa3", "BB+", "NR", etc.
  const match = raw.match(/^(AAA|AA[+-]?|A[+-]?|BBB[+-]?|BB[+-]?|B[+-]?|CCC[+-]?|CC[+-]?|C|D|NR|Aaa|Aa[1-3]|A[1-3]|Baa[1-3]|Ba[1-3]|B[1-3]|Caa[1-3]|Ca|C)/i);
  return match ? match[1] : raw.split(/\s/)[0].substring(0, 6);
}

function classifySector(sectorStr: string, pageText: string): PreferredSector {
  const combined = (sectorStr + ' ' + pageText).toLowerCase().substring(0, 3000);

  if (combined.includes('mortgage reit') || combined.includes('mortgage real estate') || combined.includes('mreit')) return 'reit-mortgage';
  if (combined.includes('real estate investment') || combined.includes('reit') || combined.includes('real estate')) return 'reit-equity';
  if (combined.includes('bank') || combined.includes('financial institution') || combined.includes('savings')) return 'bank';
  if (combined.includes('insurance') || combined.includes('insurer') || combined.includes('annuity')) return 'insurance';
  if (combined.includes('business development') || combined.includes('bdc') || combined.includes('lending')) return 'bdc';
  if (combined.includes('utility') || combined.includes('electric') || combined.includes('gas company') || combined.includes('water utility')) return 'utility';
  if (combined.includes('oil') || combined.includes('gas') || combined.includes('energy') || combined.includes('pipeline')) return 'energy';
  if (combined.includes('telecom') || combined.includes('telephone') || combined.includes('wireless') || combined.includes('communications')) return 'telecom';
  if (combined.includes('industrial') || combined.includes('manufacturing') || combined.includes('aerospace')) return 'industrial';
  return 'other';
}

function parseCookies(setCookieHeader: string): string {
  return setCookieHeader
    .split(/,(?=[^ ].*?=)/)
    .map(cookie => cookie.split(';')[0].trim())
    .join('; ');
}

function mergeCookies(existing: string, newer: string): string {
  const map = new Map<string, string>();
  for (const part of existing.split(';')) {
    const [k, ...vs] = part.trim().split('=');
    if (k) map.set(k.trim(), vs.join('=').trim());
  }
  for (const part of newer.split(';')) {
    const [k, ...vs] = part.trim().split('=');
    if (k) map.set(k.trim(), vs.join('=').trim());
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
