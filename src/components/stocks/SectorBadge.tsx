import { cn } from '@/lib/utils';
import type { PreferredSector } from '@/types/stock';

const SECTOR_LABELS: Record<PreferredSector, string> = {
  'bank': 'Bank',
  'insurance': 'Insurance',
  'reit-equity': 'REIT',
  'reit-mortgage': 'mREIT',
  'bdc': 'BDC',
  'utility': 'Utility',
  'industrial': 'Industrial',
  'energy': 'Energy',
  'telecom': 'Telecom',
  'other': 'Other',
};

const SECTOR_COLORS: Record<PreferredSector, string> = {
  'bank': 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
  'insurance': 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  'reit-equity': 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400',
  'reit-mortgage': 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400',
  'bdc': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
  'utility': 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400',
  'industrial': 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  'energy': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
  'telecom': 'bg-lime-50 text-lime-700 dark:bg-lime-950/30 dark:text-lime-400',
  'other': 'bg-muted text-muted-foreground',
};

export function SectorBadge({ sector, size = 'default' }: { sector: PreferredSector; size?: 'sm' | 'default' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium',
        size === 'sm' ? 'px-1 py-0 text-xs' : 'px-1.5 py-0.5 text-xs',
        SECTOR_COLORS[sector] ?? SECTOR_COLORS.other
      )}
    >
      {SECTOR_LABELS[sector] ?? 'Other'}
    </span>
  );
}

export { SECTOR_LABELS };
