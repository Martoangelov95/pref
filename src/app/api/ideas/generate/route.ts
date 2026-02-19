import { NextResponse } from 'next/server';
import { getStockData, getAllStocks } from '@/lib/data/stock-store';
import { streamTradeIdea } from '@/lib/ai/claude-client';
import { saveTradeIdea } from '@/lib/data/ideas-store';
import { parseTradeIdeaFromStream } from '@/lib/ai/parse-idea';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  let ticker: string;
  try {
    const body = await request.json();
    ticker = (body.ticker as string)?.toUpperCase();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!ticker) {
    return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
  }

  const stock = await getStockData(ticker);
  if (!stock) {
    return NextResponse.json({ error: `Stock ${ticker} not found in cache` }, { status: 404 });
  }

  // Get sector peers for context
  let peers: Awaited<ReturnType<typeof getAllStocks>> = [];
  try {
    const allStocks = await getAllStocks();
    peers = allStocks
      .filter(s => s.sector === stock.sector && s.ticker !== ticker && s.currentPrice > 0)
      .sort((a, b) => (b.ytc ?? 0) - (a.ytc ?? 0))
      .slice(0, 5);
  } catch {
    // peers are optional — continue without them
  }

  const encoder = new TextEncoder();
  let fullText = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamTradeIdea(stock, peers)) {
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        // After streaming, parse and save the idea
        try {
          const idea = parseTradeIdeaFromStream(fullText, ticker);
          await saveTradeIdea(idea);
        } catch (err) {
          console.error('[Ideas] Failed to parse/save idea for', ticker, err);
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Ticker': ticker,
    },
  });
}
