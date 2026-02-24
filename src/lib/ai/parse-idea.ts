import type { TradeIdea } from '@/types/ai';

export function parseTradeIdeaFromStream(text: string, ticker: string): TradeIdea {
  // Strip markdown code fences, then greedily match the full JSON object
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  let parsed: Partial<TradeIdea> = {};

  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // Could not parse JSON — continue with defaults
    }
  }

  // Extract narrative
  let summary = parsed.summary ?? '';
  const narrativeMatch = text.match(/---NARRATIVE---\s*([\s\S]+)/);
  if (narrativeMatch) {
    summary = narrativeMatch[1].trim();
  } else if (!summary) {
    // Fall back to last paragraph
    const lines = text.split('\n').filter(l => l.trim().length > 20);
    summary = lines[lines.length - 1] ?? text.substring(0, 300);
  }

  return {
    ticker,
    recommendation: (parsed.recommendation as TradeIdea['recommendation']) ?? 'HOLD',
    conviction: (parsed.conviction as TradeIdea['conviction']) ?? 'LOW',
    targetPrice: parsed.targetPrice ?? null,
    keyRisks: parsed.keyRisks ?? [],
    keyOpportunities: parsed.keyOpportunities ?? [],
    callRisk: (parsed.callRisk as TradeIdea['callRisk']) ?? 'MEDIUM',
    creditRisk: (parsed.creditRisk as TradeIdea['creditRisk']) ?? 'MEDIUM',
    relativePricing: (parsed.relativePricing as TradeIdea['relativePricing']) ?? 'FAIR',
    summary,
    generatedAt: new Date().toISOString(),
    model: 'claude-sonnet-4-6',
  };
}
