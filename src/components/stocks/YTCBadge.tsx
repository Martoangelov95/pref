import { cn } from '@/lib/utils';
import type { PreferredStock } from '@/types/stock';

interface YTCBadgeProps {
  stock: PreferredStock;
  showLabel?: boolean;
}

/**
 * Displays YTC with color coding:
 * - Green: YTC >= 7% (attractive)
 * - Emerald: YTC 5-7%
 * - Amber: YTC 3-5%
 * - Red: priced to call (call risk high) or YTC < 3%
 * - Gray: non-callable or no data
 */
export function YTCBadge({ stock, showLabel = false }: YTCBadgeProps) {
  if (stock.callStatus === 'non-callable') {
    return (
      <span className="text-xs text-muted-foreground">
        {showLabel && <span className="mr-1">YTC:</span>}
        N/A
      </span>
    );
  }

  if (stock.ytc === null) {
    return (
      <span className="text-xs text-muted-foreground">
        {showLabel && <span className="mr-1">YTC:</span>}
        --
      </span>
    );
  }

  const ytcPct = stock.ytc * 100;
  const isCallable = stock.isAlreadyCallable;

  let colorClass: string;
  let bgClass: string;

  if (stock.isPricedToCall) {
    colorClass = 'text-red-700 dark:text-red-400';
    bgClass = 'bg-red-50 dark:bg-red-950/30';
  } else if (ytcPct >= 7) {
    colorClass = 'text-green-700 dark:text-green-400';
    bgClass = 'bg-green-50 dark:bg-green-950/30';
  } else if (ytcPct >= 5) {
    colorClass = 'text-emerald-700 dark:text-emerald-400';
    bgClass = 'bg-emerald-50 dark:bg-emerald-950/30';
  } else if (ytcPct >= 3) {
    colorClass = 'text-amber-700 dark:text-amber-400';
    bgClass = 'bg-amber-50 dark:bg-amber-950/30';
  } else {
    colorClass = 'text-red-600 dark:text-red-400';
    bgClass = 'bg-red-50 dark:bg-red-950/30';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums',
        colorClass,
        bgClass
      )}
    >
      {showLabel && <span className="opacity-60 font-normal">YTC</span>}
      {stock.ytcPercent}
      {isCallable && (
        <span className="ml-0.5 opacity-70" title="Already callable">*</span>
      )}
    </span>
  );
}
