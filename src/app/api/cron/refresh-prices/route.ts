import { NextResponse } from 'next/server';
import { refreshAllPrices } from '@/lib/fetchers/batch-refresh';

export const runtime = 'nodejs';
export const maxDuration = 300;

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow if not set (development)
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await refreshAllPrices();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Cron] refresh-prices error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
