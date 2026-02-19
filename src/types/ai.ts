export type Recommendation = 'BUY' | 'HOLD' | 'AVOID' | 'SELL';
export type Conviction = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type RelativePricing = 'CHEAP' | 'FAIR' | 'EXPENSIVE';

export interface TradeIdea {
  ticker: string;
  recommendation: Recommendation;
  conviction: Conviction;
  targetPrice: number | null;
  keyRisks: string[];
  keyOpportunities: string[];
  callRisk: RiskLevel;
  creditRisk: RiskLevel;
  relativePricing: RelativePricing;
  summary: string;
  generatedAt: string; // ISO timestamp
  model: string;
}

export interface BatchScreenerIdea {
  ticker: string;
  category:
    | 'best-ytc'
    | 'overvalued'
    | 'deep-value'
    | 'call-risk-alert'
    | 'sector-pair'
    | 'income-quality';
  conviction: Conviction;
  recommendation: Recommendation;
  rationale: string;
  generatedAt: string;
}
