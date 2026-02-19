import type { TradeIdea } from '@/types/ai';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const RECOMMENDATION_STYLES: Record<string, string> = {
  BUY: 'bg-green-600 text-white',
  HOLD: 'bg-blue-600 text-white',
  AVOID: 'bg-amber-500 text-white',
  SELL: 'bg-red-600 text-white',
};

const RISK_COLORS: Record<string, string> = {
  HIGH: 'text-red-600 dark:text-red-400',
  MEDIUM: 'text-amber-600 dark:text-amber-400',
  LOW: 'text-green-600 dark:text-green-400',
};

const PRICING_COLORS: Record<string, string> = {
  CHEAP: 'text-green-600 dark:text-green-400',
  FAIR: 'text-muted-foreground',
  EXPENSIVE: 'text-red-600 dark:text-red-400',
};

interface AIIdeaCardProps {
  idea: TradeIdea;
  showTicker?: boolean;
}

export function AIIdeaCard({ idea, showTicker = true }: AIIdeaCardProps) {
  return (
    <Card className="text-sm">
      <CardHeader className="py-3 px-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {showTicker && (
              <Link
                href={`/stocks/${idea.ticker}`}
                className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                {idea.ticker}
              </Link>
            )}
            <span
              className={cn(
                'inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase',
                RECOMMENDATION_STYLES[idea.recommendation] ?? 'bg-muted'
              )}
            >
              {idea.recommendation}
            </span>
            <span className="text-xs text-muted-foreground">
              {idea.conviction} conviction
            </span>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(idea.generatedAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric'
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Summary */}
        <p className="text-sm leading-relaxed">{idea.summary}</p>

        {/* Risk indicators */}
        <div className="flex gap-4 text-xs">
          <span>
            Call risk: <span className={cn('font-medium', RISK_COLORS[idea.callRisk])}>{idea.callRisk}</span>
          </span>
          <span>
            Credit risk: <span className={cn('font-medium', RISK_COLORS[idea.creditRisk])}>{idea.creditRisk}</span>
          </span>
          <span>
            Pricing: <span className={cn('font-medium', PRICING_COLORS[idea.relativePricing])}>{idea.relativePricing}</span>
          </span>
          {idea.targetPrice && (
            <span>
              Target: <span className="font-medium">${idea.targetPrice.toFixed(2)}</span>
            </span>
          )}
        </div>

        {/* Key risks & opportunities */}
        {(idea.keyRisks.length > 0 || idea.keyOpportunities.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {idea.keyRisks.length > 0 && (
              <div>
                <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Risks</div>
                <ul className="space-y-0.5">
                  {idea.keyRisks.slice(0, 3).map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-snug">• {r}</li>
                  ))}
                </ul>
              </div>
            )}
            {idea.keyOpportunities.length > 0 && (
              <div>
                <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Opportunities</div>
                <ul className="space-y-0.5">
                  {idea.keyOpportunities.slice(0, 3).map((o, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-snug">• {o}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
