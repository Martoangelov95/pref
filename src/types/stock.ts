export type PreferredSector =
  | 'bank'
  | 'insurance'
  | 'reit-equity'
  | 'reit-mortgage'
  | 'bdc'
  | 'utility'
  | 'industrial'
  | 'energy'
  | 'telecom'
  | 'other';

export type CallStatus = 'pre-call' | 'callable' | 'well-past-call' | 'non-callable';

export type DividendType = 'cumulative' | 'non-cumulative' | 'unknown';

export interface QuantumFundamentals {
  ticker: string;
  issuerName: string;
  commonTicker: string;
  callDate: string | null; // ISO date string
  callPrice: number;
  parValue: number;
  couponRate: number; // e.g. 0.0575 for 5.75%
  annualDividend: number; // in dollars
  dividendType: DividendType;
  spRating: string | null;
  moodysRating: string | null;
  isInvestmentGrade: boolean;
  sector: PreferredSector;
  isFixedRate: boolean;
  cusip: string;
  description: string;
  scrapedAt: string; // ISO timestamp
}

export interface PriceSnapshot {
  ticker: string;
  currentPrice: number;
  previousClose: number;
  volume: number;
  avgVolume30Day: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  trailingAnnualDividendRate: number;
  shortName?: string; // Issuer display name from Yahoo Finance
  fetchedAt: string; // ISO timestamp
}

export interface CommonStockHealth {
  commonTicker: string;
  price52wChange: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  returnOnEquity: number | null;
  freeCashflow: number | null;
  marketCap: number | null;
  fetchedAt: string; // ISO timestamp
}

export interface PreferredStock {
  // Identity
  ticker: string;
  issuerName: string;
  commonTicker: string;
  cusip: string;
  sector: PreferredSector;
  description: string;

  // Price
  currentPrice: number;
  previousClose: number;
  priceChange: number;
  priceChangePct: number;

  // Yield & Call
  annualDividend: number;
  couponRate: number;
  currentYield: number;
  parValue: number;
  callPrice: number;
  callDate: string | null;
  callStatus: CallStatus;
  yearsToCall: number | null;
  ytc: number | null;
  ytcPercent: string | null;
  currentYieldPercent: string;
  isPricedToCall: boolean;
  isAlreadyCallable: boolean;

  // Credit
  spRating: string | null;
  moodysRating: string | null;
  isInvestmentGrade: boolean;
  dividendType: DividendType;
  isFixedRate: boolean;

  // Liquidity
  volume: number;
  avgVolume30Day: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;

  // Common stock health
  commonPrice52wChange: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  freeCashflow: number | null;
  marketCap: number | null;

  // Metadata
  lastPriceUpdate: string;
  lastFundamentalsUpdate: string;
}

export interface TickerEntry {
  ticker: string;
  commonTicker: string;
}
