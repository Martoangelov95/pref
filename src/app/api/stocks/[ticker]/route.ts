import { NextResponse } from 'next/server';
import { getStockData } from '@/lib/data/stock-store';
import { getTradeIdea } from '@/lib/data/ideas-store';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  try {
    const stock = await getStockData(ticker.toUpperCase());
    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    const idea = await getTradeIdea(ticker.toUpperCase());

    return NextResponse.json({ stock, idea });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
