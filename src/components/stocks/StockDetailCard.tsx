import type { PreferredStock } from '@/types/stock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { YTCBadge } from './YTCBadge';
import { RatingBadge } from './RatingBadge';
import { SectorBadge } from './SectorBadge';
import { cn } from '@/lib/utils';

interface MetricRowProps {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}

function MetricRow({ label, value, highlight }: MetricRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-1.5 border-b border-border last:border-0', highlight && 'bg-muted/30 -mx-2 px-2')}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}

interface StockDetailCardProps {
  stock: PreferredStock;
}

export function StockDetailCard({ stock }: StockDetailCardProps) {
  const callPremiumPct = stock.callPrice > 0
    ? ((stock.currentPrice / stock.callPrice - 1) * 100).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Price & Yield Card */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">Price & Yield</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-0">
          <MetricRow
            label="Current Price"
            value={
              <span className={cn(
                'font-semibold',
                stock.priceChangePct > 0 ? 'text-green-600' : stock.priceChangePct < 0 ? 'text-red-600' : ''
              )}>
                ${stock.currentPrice.toFixed(2)}
                {stock.priceChangePct !== 0 && (
                  <span className="ml-1 font-normal opacity-80">
                    ({stock.priceChangePct > 0 ? '+' : ''}{stock.priceChangePct.toFixed(2)}%)
                  </span>
                )}
              </span>
            }
          />
          <MetricRow label="Par Value" value={`$${stock.parValue.toFixed(2)}`} />
          <MetricRow label="Call Price" value={`$${stock.callPrice.toFixed(2)}`} />
          <MetricRow
            label="vs Call Price"
            value={
              callPremiumPct !== null ? (
                <span className={parseFloat(callPremiumPct) > 0 ? 'text-red-600' : 'text-green-600'}>
                  {parseFloat(callPremiumPct) > 0 ? '+' : ''}{callPremiumPct}%{' '}
                  {parseFloat(callPremiumPct) > 0 ? '(premium)' : '(discount)'}
                </span>
              ) : '--'
            }
            highlight
          />
          <MetricRow label="Annual Dividend" value={`$${stock.annualDividend.toFixed(4)}`} />
          <MetricRow label="Coupon Rate" value={`${(stock.couponRate * 100).toFixed(3)}%`} />
          <MetricRow label="Current Yield" value={stock.currentYieldPercent} />
          <MetricRow
            label="Yield to Call"
            value={<YTCBadge stock={stock} showLabel={false} />}
            highlight
          />
          <MetricRow
            label="52w Range"
            value={`$${stock.fiftyTwoWeekLow.toFixed(2)} – $${stock.fiftyTwoWeekHigh.toFixed(2)}`}
          />
        </CardContent>
      </Card>

      {/* Call & Credit Card */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">Call & Credit</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-0">
          <MetricRow
            label="Call Date"
            value={stock.callDate
              ? new Date(stock.callDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : 'No call date'}
          />
          <MetricRow
            label="Call Status"
            value={
              <span className={cn(
                'capitalize',
                stock.callStatus === 'callable' ? 'text-amber-600' :
                stock.callStatus === 'well-past-call' ? 'text-red-600' :
                'text-muted-foreground'
              )}>
                {stock.callStatus.replace(/-/g, ' ')}
              </span>
            }
          />
          <MetricRow
            label="Years to Call"
            value={stock.yearsToCall !== null
              ? stock.yearsToCall > 0 ? `${stock.yearsToCall.toFixed(2)} yrs` : 'Past call date'
              : 'N/A'}
          />
          <MetricRow
            label="Priced to Call"
            value={
              <span className={stock.isPricedToCall ? 'text-red-600 font-semibold' : 'text-green-600'}>
                {stock.isPricedToCall ? 'YES — high call risk' : 'No'}
              </span>
            }
            highlight
          />
          <MetricRow label="Sector" value={<SectorBadge sector={stock.sector} />} />
          <MetricRow
            label="S&P Rating"
            value={<RatingBadge spRating={stock.spRating} isInvestmentGrade={stock.isInvestmentGrade} />}
          />
          <MetricRow
            label="Moody's Rating"
            value={stock.moodysRating ?? <span className="text-muted-foreground">Not rated</span>}
          />
          <MetricRow
            label="Dividend Type"
            value={
              <span className={stock.dividendType === 'cumulative' ? 'text-green-600' : stock.dividendType === 'non-cumulative' ? 'text-amber-600' : ''}>
                {stock.dividendType === 'cumulative' ? 'Cumulative' :
                 stock.dividendType === 'non-cumulative' ? 'Non-cumulative' : 'Unknown'}
              </span>
            }
          />
          <MetricRow
            label="Rate Type"
            value={stock.isFixedRate ? 'Fixed Rate' : 'Float / Fixed-to-Float'}
          />
          {stock.cusip && (
            <MetricRow label="CUSIP" value={<span className="font-mono text-xs">{stock.cusip}</span>} />
          )}
        </CardContent>
      </Card>

      {/* Common Stock & Liquidity Card */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">
            Underlying Company ({stock.commonTicker})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-0">
          <MetricRow
            label="52w Price Change"
            value={
              stock.commonPrice52wChange !== null ? (
                <span className={stock.commonPrice52wChange > 0 ? 'text-green-600' : 'text-red-600'}>
                  {stock.commonPrice52wChange > 0 ? '+' : ''}
                  {(stock.commonPrice52wChange * 100).toFixed(1)}%
                </span>
              ) : '--'
            }
          />
          <MetricRow
            label="Market Cap"
            value={stock.marketCap !== null
              ? `$${(stock.marketCap / 1e9).toFixed(1)}B`
              : '--'}
          />
          <MetricRow
            label="Debt / Equity"
            value={stock.debtToEquity !== null ? `${stock.debtToEquity.toFixed(2)}x` : '--'}
          />
          <MetricRow
            label="Return on Equity"
            value={stock.returnOnEquity !== null ? `${(stock.returnOnEquity * 100).toFixed(1)}%` : '--'}
          />
          <MetricRow
            label="Free Cash Flow"
            value={stock.freeCashflow !== null
              ? `$${(stock.freeCashflow / 1e9).toFixed(2)}B`
              : '--'}
          />
          <div className="my-2 border-t border-border" />
          <MetricRow
            label="Avg Daily Volume"
            value={stock.avgVolume30Day >= 1000
              ? `${(stock.avgVolume30Day / 1000).toFixed(0)}K`
              : stock.avgVolume30Day || '--'}
          />
          <MetricRow
            label="Today's Volume"
            value={stock.volume >= 1000
              ? `${(stock.volume / 1000).toFixed(0)}K`
              : stock.volume || '--'}
          />
          <MetricRow
            label="Last Price Update"
            value={
              <span className="text-muted-foreground">
                {new Date(stock.lastPriceUpdate).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            }
          />
          <MetricRow
            label="Last Fundamentals"
            value={
              <span className="text-muted-foreground">
                {new Date(stock.lastFundamentalsUpdate).toLocaleString('en-US', {
                  month: 'short', day: 'numeric'
                })}
              </span>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
