import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getStockData } from '@/lib/data/stock-store';
import { getTradeIdea } from '@/lib/data/ideas-store';
import { StockDetailCard } from '@/components/stocks/StockDetailCard';
import { AIIdeaStream } from '@/components/ai/AIIdeaStream';
import { SectorBadge } from '@/components/stocks/SectorBadge';
import { RatingBadge } from '@/components/stocks/RatingBadge';
import { YTCBadge } from '@/components/stocks/YTCBadge';
import { Separator } from '@/components/ui/separator';

export const revalidate = 300;

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const upperTicker = ticker.toUpperCase();

  const [stock, cachedIdea] = await Promise.all([
    getStockData(upperTicker),
    getTradeIdea(upperTicker),
  ]);

  if (!stock) {
    notFound();
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/stocks"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>

        <div className="flex flex-wrap items-start gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold font-mono">{stock.ticker}</h1>
              <SectorBadge sector={stock.sector} />
              <RatingBadge
                spRating={stock.spRating}
                moodysRating={stock.moodysRating}
                isInvestmentGrade={stock.isInvestmentGrade}
              />
            </div>
            <p className="text-muted-foreground text-sm">{stock.issuerName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Underlying: <span className="font-mono">{stock.commonTicker}</span>
            </p>
          </div>

          <div className="ml-auto flex items-start gap-6">
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums">
                {stock.currentPrice > 0 ? `$${stock.currentPrice.toFixed(2)}` : '--'}
              </div>
              {stock.priceChangePct !== 0 && (
                <div className={`text-sm tabular-nums ${stock.priceChangePct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stock.priceChangePct > 0 ? '+' : ''}{stock.priceChangePct.toFixed(2)}%
                </div>
              )}
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs text-muted-foreground">Current Yield</div>
              <div className="text-base font-semibold tabular-nums">{stock.currentYieldPercent}</div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs text-muted-foreground">Yield to Call</div>
              <YTCBadge stock={stock} />
            </div>
          </div>
        </div>

        {stock.description && stock.description !== `${stock.issuerName} - ${stock.ticker}` && (
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl">{stock.description}</p>
        )}
      </div>

      <Separator />

      {/* Metrics Grid */}
      <StockDetailCard stock={stock} />

      <Separator />

      {/* AI Trade Idea */}
      <div>
        <h2 className="text-base font-semibold mb-3">AI Trade Analysis</h2>
        <AIIdeaStream ticker={stock.ticker} cachedIdea={cachedIdea} />
      </div>
    </div>
  );
}
