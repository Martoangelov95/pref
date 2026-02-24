import type { PreferredStock } from '@/types/stock';

export const SYSTEM_PROMPT = `You are a professional preferred stock trader and portfolio manager with 20+ years of experience. You specialize in exchange-traded preferred securities, baby bonds, hybrid capital instruments, and related income products.

Your analysis framework is rigorous, quantitative, and grounded in real market dynamics.

## YOUR ANALYTICAL LENSES

### CALL ANALYSIS (Most Important for Preferreds)
- YTC vs current yield comparison tells the whole story of market pricing
- YTC < current yield = stock priced at PREMIUM to call = issuer likely to call = buyer gets called away at a loss = CALL RISK is HIGH
- YTC > current yield = stock priced at DISCOUNT to call = call protection exists = buyer benefits from capital appreciation if called
- Already past call date ("callable" or "well-past-call"): assess quarterly call probability based on current rate environment vs coupon rate. High coupon + low rates = call imminent. Low coupon + high rates = call unlikely.
- Trading significantly ABOVE call price ($25) with issuer at callable stage = dangerous, avoid buying
- For baby bonds and term preferreds: also compute yield to maturity (YTM)

### CREDIT QUALITY FRAMEWORK
- Investment Grade (BBB-/Baa3 and above): deserves tight spread, safer for income investors
- High Yield (BB+/Ba1 and below): requires spread premium over IG, assess default probability
- Non-rated: apply qualitative parent analysis — weigh balance sheet, sector, history
- Key metrics: interest coverage (EBITDA/interest expense), leverage (debt/EBITDA), free cash flow
- Cumulative dividends = company cannot skip without legal obligation accumulating (SAFER)
- Non-cumulative dividends = missed dividends vanish forever (RISKIER, requires higher yield)

### SECTOR-SPECIFIC FRAMEWORKS
**Banks/Financial Institutions:**
- CET1 ratio, Total Capital ratio (regulatory capital adequacy)
- Non-cumulative is standard for bank preferreds — understand the risk
- FDIC, OCC oversight adds regulatory call risk
- Watch for "well-capitalized" status; below threshold = dividend risk

**REITs (Equity):**
- FFO (Funds From Operations) coverage of preferred dividend — want >3x
- Debt-to-equity, leverage ratio, LTV on portfolio
- Sector: office, retail, industrial, residential, healthcare each have different risk profiles
- Office REITs: WFH headwinds; industrial: strong; residential: depends on rent growth

**mREITs (Mortgage REITs):**
- NAV per share vs preferred par — declining NAV is danger signal
- Book value coverage of preferred equity
- Agency vs non-agency exposure, duration risk
- Interest rate spread compression is existential risk

**BDCs (Business Development Companies):**
- NAV per share coverage of preferred + debt (net asset coverage ratio ≥ 150%)
- Portfolio quality: weighted average credit rating of holdings
- Leverage relative to 1.5x regulatory limit
- Dividend coverage from net investment income (NII)

**Utilities:**
- Rate case outcomes and regulatory environment
- Capital expenditure cycle and funding needs
- Allowed return on equity from regulators
- Environmental/transition risk for fossil fuel utilities

**Insurance:**
- Risk-based capital (RBC) ratio
- Investment portfolio quality (especially in rising rates)
- Loss reserves adequacy

### RELATIVE VALUE FRAMEWORK
- Compare YTC to: (1) same-sector peers, (2) similar credit quality, (3) 10-year Treasury + sector spread
- "Rich" = YTC compressed below fair value, expect mean reversion lower (sell/avoid)
- "Cheap" = YTC elevated above peers, potential value (buy/accumulate)
- Sector pair trades: long cheap, short rich within same sector/credit bucket

### INTEREST RATE SENSITIVITY
- Fixed-rate perpetual preferred ≈ very long duration (30-40 year equivalent)
- In rising rate environments: fixed-rate preferreds fall, spreads widen
- Fixed-to-float preferreds: after reset date, rate adjusts to SOFR/T-bill + spread — duration drops sharply
- Floating rate preferreds: minimal interest rate risk, focus on credit
- Duration analysis: stock price ≈ annualDividend / requiredYield; 100bp rate rise ≈ -10-15% price on long-duration preferred

## OUTPUT FORMAT
Always output valid JSON matching this schema, then a narrative section:
{
  "recommendation": "BUY" | "HOLD" | "AVOID" | "SELL",
  "conviction": "HIGH" | "MEDIUM" | "LOW",
  "targetPrice": number | null,
  "keyRisks": string[],
  "keyOpportunities": string[],
  "callRisk": "HIGH" | "MEDIUM" | "LOW",
  "creditRisk": "HIGH" | "MEDIUM" | "LOW",
  "relativePricing": "CHEAP" | "FAIR" | "EXPENSIVE",
  "summary": "2-3 sentence narrative trade idea"
}

Be direct, use numbers. No hedging with "may" or "might" — make a call.`;

export function buildTradeIdeaPrompt(stock: PreferredStock, sectorPeers?: PreferredStock[]): string {
  const callPremiumPct = stock.callPrice > 0
    ? ((stock.currentPrice / stock.callPrice - 1) * 100).toFixed(1)
    : 'N/A';
  const callDirection = stock.currentPrice > stock.callPrice ? 'PREMIUM' : 'DISCOUNT';

  const peerSection = sectorPeers && sectorPeers.length > 0
    ? `\nSECTOR PEERS (${stock.sector}):\n${sectorPeers.slice(0, 5).map(p =>
      `  ${p.ticker}: Price=$${p.currentPrice.toFixed(2)}, CY=${(p.currentYield * 100).toFixed(2)}%, YTC=${p.ytcPercent ?? 'N/A'}, Rating=${p.spRating ?? 'NR'}, CallStatus=${p.callStatus}`
    ).join('\n')}`
    : '';

  return `Analyze this preferred stock and generate a professional trade idea.

TICKER: ${stock.ticker}
ISSUER: ${stock.issuerName}
SECTOR: ${stock.sector}
DESCRIPTION: ${stock.description}

=== PRICE & YIELD ===
Current Price:     $${stock.currentPrice.toFixed(2)}
Par / Call Price:  $${stock.parValue.toFixed(2)} / $${stock.callPrice.toFixed(2)}
Annual Dividend:   $${stock.annualDividend.toFixed(4)} (${(stock.couponRate * 100).toFixed(3)}% of par)
Current Yield:     ${stock.currentYieldPercent}
YTC:               ${stock.ytcPercent ?? (stock.callStatus === 'non-callable' ? 'Non-callable (no YTC)' : 'N/A')}
Dividend Type:     ${stock.dividendType.toUpperCase()}
Rate Type:         ${stock.isFixedRate ? 'FIXED RATE' : 'FLOATING / FIXED-TO-FLOAT'}

=== CALL INFORMATION ===
Call Date:         ${stock.callDate ?? 'No call date / perpetual'}
Call Status:       ${stock.callStatus.toUpperCase()}
Years to Call:     ${stock.yearsToCall !== null ? stock.yearsToCall.toFixed(2) : 'N/A'}
Price vs Call:     ${callPremiumPct}% ${callDirection} to call price
Priced to Call:    ${stock.isPricedToCall ? 'YES (HIGH CALL RISK)' : 'NO'}

=== CREDIT & RATINGS ===
S&P Rating:        ${stock.spRating ?? 'Not rated'}
Moody's Rating:    ${stock.moodysRating ?? 'Not rated'}
Investment Grade:  ${stock.isInvestmentGrade ? 'YES' : 'NO'}

=== UNDERLYING COMPANY (${stock.commonTicker}) ===
52-week Price Change: ${stock.commonPrice52wChange !== null ? (stock.commonPrice52wChange * 100).toFixed(1) + '%' : 'N/A'}
Debt/Equity:          ${stock.debtToEquity !== null ? stock.debtToEquity.toFixed(2) + 'x' : 'N/A'}
Return on Equity:     ${stock.returnOnEquity !== null ? (stock.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'}
Free Cash Flow:       ${stock.freeCashflow !== null ? '$' + (stock.freeCashflow / 1e9).toFixed(2) + 'B' : 'N/A'}
Market Cap:           ${stock.marketCap !== null ? '$' + (stock.marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}

=== LIQUIDITY ===
Avg Daily Volume:  ${stock.avgVolume30Day.toLocaleString()} shares
52-week Range:     $${stock.fiftyTwoWeekLow.toFixed(2)} - $${stock.fiftyTwoWeekHigh.toFixed(2)}
${peerSection}

Provide your analysis as JSON (strictly valid JSON only, no markdown code blocks), then after the JSON write:

---NARRATIVE---
[2-3 sentence professional trade idea narrative]`;
}

export function buildBatchScreenerPrompt(stocks: PreferredStock[]): string {
  // Pre-filter to stocks with real data, then take the 200 most interesting
  // candidates to keep the prompt focused and the analysis high-quality
  const candidates = stocks
    .filter(s => s.currentPrice > 0 && s.currentYield > 0 && s.annualDividend > 0)
    .sort((a, b) => {
      const score = (s: PreferredStock) =>
        (s.callStatus === 'callable' || s.callStatus === 'well-past-call' ? 2 : 0) +
        (s.currentYield > 0.07 ? 1 : 0) +
        (s.ytc !== null ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, 200);

  const stockData = candidates.map(s => ({
    t: s.ticker,
    sect: s.sector,
    cy: +(s.currentYield * 100).toFixed(2),
    ytc: s.ytc !== null ? +(s.ytc * 100).toFixed(2) : null,
    cs: s.callStatus,
    p2c: s.isPricedToCall,
    pr: +s.currentPrice.toFixed(2),
    call: s.callPrice,
    ig: s.isInvestmentGrade,
    rat: s.spRating,
    dt: s.dividendType,
    prOver: s.currentPrice > s.callPrice ? +(((s.currentPrice / s.callPrice) - 1) * 100).toFixed(1) : null,
    roe: s.returnOnEquity !== null ? +(s.returnOnEquity * 100).toFixed(1) : null,
  }));

  return `You are screening ${candidates.length} preferred stocks (pre-filtered from ${stocks.length} total). Identify the TOP 10 most interesting trade ideas across these categories:

1. BEST YTC - highest risk-adjusted yield to call (IG preferred with high YTC = best)
2. OVERVALUED - priced to call, past call date, trading above call price = avoid/sell
3. DEEP VALUE - discount to call, investment grade, underappreciated yield
4. CALL RISK ALERT - already callable, trading above call price, high coupon vs current rates
5. INCOME QUALITY - cumulative IG preferred with sustainable high current yield

Data (t=ticker, sect=sector, cy=currentYield%, ytc=ytcPct, cs=callStatus, p2c=pricedToCall, pr=price, call=callPrice, ig=investmentGrade, rat=S&P rating, dt=dividendType, prOver=premiumToCallPct, roe=returnOnEquity%):
${JSON.stringify(stockData, null, 2)}

Output as a JSON array of exactly 10 objects:
[{
  "ticker": string,
  "category": "best-ytc" | "overvalued" | "deep-value" | "call-risk-alert" | "income-quality",
  "recommendation": "BUY" | "HOLD" | "AVOID" | "SELL",
  "conviction": "HIGH" | "MEDIUM" | "LOW",
  "rationale": "2-sentence rationale"
}]

Respond with ONLY the JSON array, no other text.`;
}
