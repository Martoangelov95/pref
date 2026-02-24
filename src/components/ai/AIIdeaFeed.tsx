import type { TradeIdea, BatchScreenerIdea } from '@/types/ai';
import { AIIdeaCard } from './AIIdeaCard';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const CATEGORY_LABELS: Record<BatchScreenerIdea['category'], string> = {
  'best-ytc': 'Best YTC',
  'overvalued': 'Overvalued',
  'deep-value': 'Deep Value',
  'call-risk-alert': 'Call Risk Alert',
  'sector-pair': 'Sector Pair',
  'income-quality': 'Income Quality',
};

const CATEGORY_COLORS: Record<BatchScreenerIdea['category'], string> = {
  'best-ytc': 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  'overvalued': 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  'deep-value': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  'call-risk-alert': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  'sector-pair': 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  'income-quality': 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
};

const REC_COLORS: Record<string, string> = {
  BUY: 'bg-green-600 text-white',
  HOLD: 'bg-blue-600 text-white',
  AVOID: 'bg-amber-500 text-white',
  SELL: 'bg-red-600 text-white',
};

export function ScreenerIdeas({ ideas }: { ideas: BatchScreenerIdea[] }) {
  if (ideas.length === 0) {
    return (
      <div className="text-center py-10 space-y-2">
        <p className="text-sm text-muted-foreground">No screener ideas yet.</p>
        <p className="text-xs text-muted-foreground">
          Click <span className="font-medium text-foreground">Run AI Screener</span> above to generate the top 10 trade ideas.
          Make sure prices are loaded first (stocks dashboard → Refresh prices).
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {ideas.map(idea => (
        <div key={idea.ticker} className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link
                href={`/stocks/${idea.ticker}`}
                className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                {idea.ticker}
              </Link>
              <span className={cn(
                'inline-flex rounded px-2 py-0.5 text-xs font-bold uppercase',
                REC_COLORS[idea.recommendation] ?? 'bg-muted'
              )}>
                {idea.recommendation}
              </span>
            </div>
            <span className={cn(
              'inline-flex rounded px-1.5 py-0.5 text-xs font-medium',
              CATEGORY_COLORS[idea.category]
            )}>
              {CATEGORY_LABELS[idea.category]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{idea.rationale}</p>
          <div className="text-xs text-muted-foreground">
            Conviction: {idea.conviction}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentIdeasFeed({ ideas }: { ideas: TradeIdea[] }) {
  if (ideas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No individual ideas generated yet. Click "Generate AI Trade Idea" on any stock detail page.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ideas.map(idea => (
        <AIIdeaCard key={idea.ticker} idea={idea} />
      ))}
    </div>
  );
}
