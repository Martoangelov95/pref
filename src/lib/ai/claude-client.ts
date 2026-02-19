import Anthropic from '@anthropic-ai/sdk';
import type { TradeIdea, BatchScreenerIdea } from '@/types/ai';
import type { PreferredStock } from '@/types/stock';
import { SYSTEM_PROMPT, buildTradeIdeaPrompt, buildBatchScreenerPrompt } from './prompts';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const ANALYSIS_MODEL = 'claude-opus-4-6';
const STREAMING_MODEL = 'claude-sonnet-4-6';

/**
 * Generate a trade idea for a single stock. Returns structured TradeIdea.
 */
export async function generateTradeIdea(
  stock: PreferredStock,
  peers?: PreferredStock[]
): Promise<TradeIdea> {
  const client = getClient();
  const prompt = buildTradeIdeaPrompt(stock, peers);

  const response = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '';
  return parseTradeIdeaResponse(text, stock.ticker);
}

/**
 * Stream a trade idea for real-time UI display.
 * Yields text chunks as they arrive.
 */
export async function* streamTradeIdea(
  stock: PreferredStock,
  peers?: PreferredStock[]
): AsyncGenerator<string> {
  const client = getClient();
  const prompt = buildTradeIdeaPrompt(stock, peers);

  const stream = await client.messages.create({
    model: STREAMING_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}

/**
 * Run the batch screener on all stocks to find top 10 ideas.
 */
export async function runBatchScreener(stocks: PreferredStock[]): Promise<BatchScreenerIdea[]> {
  const client = getClient();
  const prompt = buildBatchScreenerPrompt(stocks);

  const response = await client.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '';

  try {
    const ideas = JSON.parse(text) as BatchScreenerIdea[];
    return ideas.map(idea => ({
      ...idea,
      generatedAt: new Date().toISOString(),
    }));
  } catch {
    console.error('[Claude] Failed to parse batch screener response:', text.substring(0, 500));
    return [];
  }
}

function parseTradeIdeaResponse(text: string, ticker: string): TradeIdea {
  // Extract JSON block from the response
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  let parsed: Partial<TradeIdea> = {};

  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // fallback: extract narrative only
    }
  }

  // Extract narrative section
  let summary = parsed.summary ?? '';
  const narrativeMatch = text.match(/---NARRATIVE---\s*([\s\S]+)/);
  if (narrativeMatch) {
    summary = narrativeMatch[1].trim();
  }

  return {
    ticker,
    recommendation: parsed.recommendation ?? 'HOLD',
    conviction: parsed.conviction ?? 'LOW',
    targetPrice: parsed.targetPrice ?? null,
    keyRisks: parsed.keyRisks ?? [],
    keyOpportunities: parsed.keyOpportunities ?? [],
    callRisk: parsed.callRisk ?? 'MEDIUM',
    creditRisk: parsed.creditRisk ?? 'MEDIUM',
    relativePricing: parsed.relativePricing ?? 'FAIR',
    summary: summary || text.substring(0, 300),
    generatedAt: new Date().toISOString(),
    model: ANALYSIS_MODEL,
  };
}
