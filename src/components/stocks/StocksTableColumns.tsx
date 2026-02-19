'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ColumnDef, Column } from '@tanstack/react-table';
import type { PreferredStock } from '@/types/stock';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { YTCBadge } from './YTCBadge';
import { RatingBadge } from './RatingBadge';
import { SectorBadge } from './SectorBadge';
import { cn } from '@/lib/utils';

function SortButton({
  column,
  children,
}: {
  column: Column<PreferredStock, unknown>;
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-7 px-2 gap-1 font-medium text-xs"
      onClick={() => column.toggleSorting()}
    >
      {children}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </Button>
  );
}

export const STOCK_COLUMNS: ColumnDef<PreferredStock>[] = [
  {
    accessorKey: 'ticker',
    header: ({ column }) => <SortButton column={column}>Ticker</SortButton>,
    cell: ({ row }) => (
      <Link
        href={`/stocks/${row.original.ticker}`}
        className="font-mono font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.ticker}
      </Link>
    ),
    size: 90,
  },
  {
    accessorKey: 'issuerName',
    header: ({ column }) => <SortButton column={column}>Issuer</SortButton>,
    cell: ({ row }) => (
      <span className="text-xs max-w-[180px] truncate block" title={row.original.issuerName}>
        {row.original.issuerName}
      </span>
    ),
    size: 190,
  },
  {
    accessorKey: 'sector',
    header: 'Sector',
    cell: ({ row }) => <SectorBadge sector={row.original.sector} />,
    size: 80,
    filterFn: (row, _id, value: string[]) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.original.sector);
    },
  },
  {
    accessorKey: 'currentPrice',
    header: ({ column }) => <SortButton column={column}>Price</SortButton>,
    cell: ({ row }) => {
      const p = row.original.currentPrice;
      const change = row.original.priceChangePct;
      if (!p) return <span className="text-xs text-muted-foreground">--</span>;
      return (
        <div className="text-xs tabular-nums">
          <span className="font-medium">${p.toFixed(2)}</span>
          {change !== 0 && (
            <span className={cn('ml-1', change > 0 ? 'text-green-600' : 'text-red-600')}>
              {change > 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
        </div>
      );
    },
    size: 90,
  },
  {
    accessorKey: 'parValue',
    header: 'Par',
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        ${row.original.parValue.toFixed(0)}
      </span>
    ),
    size: 50,
  },
  {
    accessorKey: 'couponRate',
    header: ({ column }) => <SortButton column={column}>Coupon</SortButton>,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums">
        {(row.original.couponRate * 100).toFixed(3)}%
      </span>
    ),
    size: 70,
  },
  {
    accessorKey: 'currentYield',
    header: ({ column }) => <SortButton column={column}>Curr Yld</SortButton>,
    cell: ({ row }) => {
      const cy = row.original.currentYield;
      if (!cy) return <span className="text-xs text-muted-foreground">--</span>;
      return (
        <span className="text-xs tabular-nums font-medium">
          {(cy * 100).toFixed(2)}%
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: 'ytc',
    header: ({ column }) => <SortButton column={column}>YTC</SortButton>,
    cell: ({ row }) => <YTCBadge stock={row.original} />,
    size: 90,
    sortUndefined: 'last',
  },
  {
    accessorKey: 'callDate',
    header: ({ column }) => <SortButton column={column}>Call Date</SortButton>,
    cell: ({ row }) => {
      const cd = row.original.callDate;
      if (!cd) return <span className="text-xs text-muted-foreground">Perpetual</span>;
      return (
        <span className="text-xs tabular-nums">
          {new Date(cd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      );
    },
    size: 100,
  },
  {
    accessorKey: 'callStatus',
    header: 'Call Status',
    cell: ({ row }) => {
      const cs = row.original.callStatus;
      const colors: Record<string, string> = {
        'pre-call': 'bg-muted text-muted-foreground',
        'callable': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
        'well-past-call': 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
        'non-callable': 'bg-muted text-muted-foreground',
      };
      const labels: Record<string, string> = {
        'pre-call': 'Pre-call',
        'callable': 'Callable',
        'well-past-call': 'Past call',
        'non-callable': 'No call',
      };
      return (
        <span className={cn('inline-flex rounded px-1.5 py-0.5 text-xs font-medium', colors[cs] ?? colors['pre-call'])}>
          {labels[cs] ?? cs}
        </span>
      );
    },
    size: 85,
    filterFn: (row, _id, value: string[]) => {
      if (!value || value.length === 0) return true;
      return value.includes(row.original.callStatus);
    },
  },
  {
    accessorKey: 'spRating',
    header: 'Rating',
    cell: ({ row }) => (
      <RatingBadge
        spRating={row.original.spRating}
        moodysRating={row.original.moodysRating}
        isInvestmentGrade={row.original.isInvestmentGrade}
      />
    ),
    size: 65,
    filterFn: (row, _id, value: boolean | null) => {
      if (value === null || value === undefined) return true;
      return row.original.isInvestmentGrade === value;
    },
  },
  {
    accessorKey: 'dividendType',
    header: 'Div Type',
    cell: ({ row }) => {
      const dt = row.original.dividendType;
      const colorClass =
        dt === 'cumulative'
          ? 'text-green-700 dark:text-green-400'
          : dt === 'non-cumulative'
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-muted-foreground';
      return (
        <span className={cn('text-xs', colorClass)}>
          {dt === 'cumulative' ? 'Cum' : dt === 'non-cumulative' ? 'Non-cum' : '?'}
        </span>
      );
    },
    size: 70,
    filterFn: (row, _id, value: string) => {
      if (!value) return true;
      return row.original.dividendType === value;
    },
  },
  {
    id: 'commonStock',
    header: 'Common',
    cell: ({ row }) => {
      const pct = row.original.commonPrice52wChange;
      return (
        <div className="text-xs">
          <span className="text-muted-foreground font-mono">{row.original.commonTicker}</span>
          {pct !== null && (
            <span className={cn('ml-1', pct > 0 ? 'text-green-600' : 'text-red-600')}>
              {pct > 0 ? '+' : ''}{(pct * 100).toFixed(1)}%
            </span>
          )}
        </div>
      );
    },
    size: 90,
  },
  {
    accessorKey: 'avgVolume30Day',
    header: ({ column }) => <SortButton column={column}>Avg Vol</SortButton>,
    cell: ({ row }) => {
      const vol = row.original.avgVolume30Day;
      if (!vol) return <span className="text-xs text-muted-foreground">--</span>;
      const display = vol >= 1000000
        ? (vol / 1000000).toFixed(1) + 'M'
        : vol >= 1000
        ? (vol / 1000).toFixed(0) + 'K'
        : vol.toString();
      return <span className="text-xs tabular-nums text-muted-foreground">{display}</span>;
    },
    size: 75,
  },
];
