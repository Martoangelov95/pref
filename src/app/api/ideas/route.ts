import { NextResponse } from 'next/server';
import { getRecentIdeas, getBatchScreenerIdeas } from '@/lib/data/ideas-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'recent';

  try {
    if (type === 'screener') {
      const ideas = await getBatchScreenerIdeas();
      return NextResponse.json({ ideas });
    }
    const ideas = await getRecentIdeas(20);
    return NextResponse.json({ ideas });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
