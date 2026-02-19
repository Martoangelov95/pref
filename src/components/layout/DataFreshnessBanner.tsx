interface DataFreshnessBannerProps {
  lastPriceUpdate?: string | null;
  lastFundamentalsUpdate?: string | null;
  stockCount?: number;
}

export function DataFreshnessBanner({
  lastPriceUpdate,
  lastFundamentalsUpdate,
  stockCount,
}: DataFreshnessBannerProps) {
  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return 'Never';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 px-1">
      {stockCount !== undefined && (
        <span className="font-medium text-foreground">{stockCount} securities</span>
      )}
      <span>Prices: {formatTime(lastPriceUpdate)}</span>
      <span>Fundamentals: {formatTime(lastFundamentalsUpdate)}</span>
    </div>
  );
}
