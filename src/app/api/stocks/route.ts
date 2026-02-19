import { NextResponse } from 'next/server';
import { getAllStocks } from '@/lib/data/stock-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const stocks = await getAllStocks();
    return NextResponse.json({ stocks });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
