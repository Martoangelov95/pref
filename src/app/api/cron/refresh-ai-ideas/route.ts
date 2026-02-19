import { NextResponse } from 'next/server';
import { getAllStocks } from '@/lib/data/stock-store';
import { runBatchScreener } from '@/lib/ai/claude-client';
import { saveBatchScreenerIdeas } from '@/lib/data/ideas-store';
import { redis } from '@/lib/redis';
import { CACHE_KEYS } from '@/lib/cache-keys';

export const runtime = 'nodejs';
export const maxDuration = 300;

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stocks = await getAllStocks();

    if (stocks.length === 0) {
      return NextResponse.json({ success: false, error: 'No stocks in cache. Run refresh-prices and refresh-fundamentals first.' }, { status: 400 });
    }

    const ideas = await runBatchScreener(stocks);
    await saveBatchScreenerIdeas(ideas);
    await redis.set(CACHE_KEYS.metaLastAIRefresh, new Date().toISOString());

    return NextResponse.json({
      success: true,
      ideasGenerated: ideas.length,
      stocksAnalyzed: stocks.length,
    });
  } catch (error) {
    console.error('[Cron] refresh-ai-ideas error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
