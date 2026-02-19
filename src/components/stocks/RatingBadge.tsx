import { cn } from '@/lib/utils';

interface RatingBadgeProps {
  spRating?: string | null;
  moodysRating?: string | null;
  isInvestmentGrade?: boolean;
  size?: 'sm' | 'default';
}

export function RatingBadge({
  spRating,
  moodysRating,
  isInvestmentGrade,
  size = 'default',
}: RatingBadgeProps) {
  const display = spRating ?? moodysRating ?? 'NR';
  const isIG = isInvestmentGrade ?? false;

  const colorClass = isIG
    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
    : display === 'NR'
    ? 'bg-muted text-muted-foreground'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium tabular-nums',
        size === 'sm' ? 'px-1 py-0 text-xs' : 'px-1.5 py-0.5 text-xs',
        colorClass
      )}
      title={[spRating && `S&P: ${spRating}`, moodysRating && `Moody's: ${moodysRating}`]
        .filter(Boolean)
        .join(' | ') || 'Not rated'}
    >
      {display}
    </span>
  );
}
