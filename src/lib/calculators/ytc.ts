export interface YTCInputs {
  currentPrice: number;
  callPrice: number;
  annualDividend: number;
  yearsToCall: number;
  dividendsPerYear?: number; // default 4 (quarterly)
}

export interface YTCResult {
  ytc: number; // decimal (e.g. 0.058 = 5.8%)
  ytcPercent: string; // formatted "5.80%"
  currentYield: number;
  currentYieldPercent: string;
  isPricedToCall: boolean; // YTC significantly < currentYield
  isAlreadyCallable: boolean;
  callPremiumDiscount: number; // (callPrice - currentPrice) / currentPrice
  yearsToCall: number;
}

/**
 * Calculates Yield to Call using Newton-Raphson iteration.
 *
 * Solves for annual rate r such that:
 *   currentPrice = sum_{t=1}^{n}[ D/(1+r/freq)^t ] + C/(1+r/freq)^n
 *
 * where:
 *   D = periodicDividend = annualDividend / dividendsPerYear
 *   C = callPrice
 *   n = yearsToCall * dividendsPerYear  (total periods)
 *   freq = dividendsPerYear
 */
export function calculateYTC(inputs: YTCInputs): YTCResult {
  const { currentPrice, callPrice, annualDividend, yearsToCall } = inputs;
  const freq = inputs.dividendsPerYear ?? 4;

  const currentYield = annualDividend / currentPrice;
  const callPremiumDiscount = (callPrice - currentPrice) / currentPrice;

  if (yearsToCall <= 0) {
    // Already callable — YTC is undefined in the traditional sense
    return {
      ytc: currentYield,
      ytcPercent: formatPct(currentYield),
      currentYield,
      currentYieldPercent: formatPct(currentYield),
      isPricedToCall: currentPrice > callPrice,
      isAlreadyCallable: true,
      callPremiumDiscount,
      yearsToCall,
    };
  }

  const D = annualDividend / freq;
  const n = yearsToCall * freq;

  // PV given annual rate r
  function pv(r: number): number {
    const p = r / freq; // periodic rate
    let sum = 0;
    for (let t = 1; t <= n; t++) {
      sum += D / Math.pow(1 + p, t);
    }
    sum += callPrice / Math.pow(1 + p, n);
    return sum;
  }

  // dPV/dr — derivative used in Newton-Raphson
  function dpv(r: number): number {
    const p = r / freq;
    let sum = 0;
    for (let t = 1; t <= n; t++) {
      sum -= (t / freq) * D / Math.pow(1 + p, t + 1);
    }
    sum -= (n / freq) * callPrice / Math.pow(1 + p, n + 1);
    return sum;
  }

  // Initial guess: current yield
  let r = currentYield;
  const MAX_ITER = 200;
  const TOL = 1e-10;

  for (let i = 0; i < MAX_ITER; i++) {
    const f = pv(r) - currentPrice;
    const df = dpv(r);
    if (Math.abs(df) < 1e-15) break;
    const rNew = r - f / df;
    if (Math.abs(rNew - r) < TOL) {
      r = rNew;
      break;
    }
    r = rNew;
    // Clamp to avoid divergence
    if (r < -0.5) r = -0.5;
    if (r > 5) r = 5;
  }

  // YTC < currentYield means premium-to-call pricing = bad for buyer (call risk)
  const isPricedToCall = r < currentYield - 0.002; // 20bp tolerance

  return {
    ytc: r,
    ytcPercent: formatPct(r),
    currentYield,
    currentYieldPercent: formatPct(currentYield),
    isPricedToCall,
    isAlreadyCallable: false,
    callPremiumDiscount,
    yearsToCall,
  };
}

/**
 * Approximate YTC formula (faster, ~10bp error for long durations):
 *   YTC ≈ [D + (C - P) / n] / [(C + P) / 2]
 * where D = annual dividend, C = call price, P = current price, n = years to call
 */
export function calculateYTCApprox(inputs: YTCInputs): number {
  const { currentPrice, callPrice, annualDividend, yearsToCall } = inputs;
  if (yearsToCall <= 0) return annualDividend / currentPrice;
  return (annualDividend + (callPrice - currentPrice) / yearsToCall) /
    ((callPrice + currentPrice) / 2);
}

/**
 * Returns fractional years from now until callDate.
 * Negative = already past call.
 */
export function yearsUntilDate(callDate: Date): number {
  const now = Date.now();
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  return (callDate.getTime() - now) / MS_PER_YEAR;
}

export function getCallStatus(
  callDate: Date | null,
  currentPrice: number,
  callPrice: number
): { status: 'pre-call' | 'callable' | 'well-past-call' | 'non-callable'; yearsToCall: number | null } {
  if (!callDate) return { status: 'non-callable', yearsToCall: null };
  const years = yearsUntilDate(callDate);
  let status: 'pre-call' | 'callable' | 'well-past-call';
  if (years > 0) {
    status = 'pre-call';
  } else if (years > -2) {
    status = 'callable';
  } else {
    status = 'well-past-call';
  }
  return { status, yearsToCall: years };
}

function formatPct(decimal: number): string {
  return (decimal * 100).toFixed(2) + '%';
}

/**
 * Determines if a rating is investment grade.
 * IG: BBB- and above (S&P), Baa3 and above (Moody's)
 */
export function isInvestmentGrade(spRating: string | null, moodysRating: string | null): boolean {
  const IG_SP = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-'];
  const IG_MOODYS = ['Aaa', 'Aa1', 'Aa2', 'Aa3', 'A1', 'A2', 'A3', 'Baa1', 'Baa2', 'Baa3'];

  if (spRating) {
    const normalized = spRating.trim().toUpperCase();
    if (IG_SP.some(r => normalized.startsWith(r))) return true;
    if (['BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC', 'CC', 'C', 'D'].some(r => normalized.startsWith(r))) return false;
  }
  if (moodysRating) {
    const normalized = moodysRating.trim();
    if (IG_MOODYS.some(r => normalized.startsWith(r))) return true;
  }
  return false; // default to false if not rated
}
