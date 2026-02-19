import { getAllStocks } from '@/lib/data/stock-store';
import { redis } from '@/lib/redis';
import { CACHE_KEYS } from '@/lib/cache-keys';
import { StocksTable } from '@/components/stocks/StocksTable';
import { DataFreshnessBanner } from '@/components/layout/DataFreshnessBanner';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default async function StocksPage() {
  const [stocks, lastPriceUpdate, lastFundamentalsUpdate] = await Promise.all([
    getAllStocks(),
    redis.get<string>(CACHE_KEYS.metaLastPriceRefresh),
    redis.get<string>(CACHE_KEYS.metaLastFundamentalsRefresh),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Preferred Stock Dashboard</h1>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <RefreshLinks />
        </div>
      </div>
      <DataFreshnessBanner
        lastPriceUpdate={lastPriceUpdate}
        lastFundamentalsUpdate={lastFundamentalsUpdate}
        stockCount={stocks.length}
      />
      <StocksTable stocks={stocks} />
    </div>
  );
}

function RefreshLinks() {
  return (
    <div className="flex gap-2 text-xs">
      <a
        href="/api/cron/refresh-prices"
        className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        title="Manually trigger price refresh"
      >
        Refresh prices
      </a>
      <span className="text-border">|</span>
      <a
        href="/api/cron/refresh-fundamentals"
        className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        title="Manually trigger fundamentals scrape"
      >
        Refresh fundamentals
      </a>
      <span className="text-border">|</span>
      <a
        href="/api/cron/refresh-ai-ideas"
        className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        title="Run AI screener"
      >
        Run AI screener
      </a>
    </div>
  );
}
