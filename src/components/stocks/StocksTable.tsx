'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import type { PreferredStock, PreferredSector } from '@/types/stock';
import { STOCK_COLUMNS } from './StocksTableColumns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { SECTOR_LABELS } from './SectorBadge';

const SECTORS: PreferredSector[] = [
  'bank', 'insurance', 'reit-equity', 'reit-mortgage', 'bdc',
  'utility', 'industrial', 'energy', 'telecom', 'other',
];

interface StocksTableProps {
  stocks: PreferredStock[];
}

export function StocksTable({ stocks }: StocksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'ytc', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [igOnly, setIgOnly] = useState(false);
  const [cumOnly, setCumOnly] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<PreferredSector[]>([]);

  // Apply custom filters outside of TanStack for multi-value sector filter
  const filteredStocks = useMemo(() => {
    let result = stocks;

    if (globalFilter) {
      const q = globalFilter.toLowerCase();
      result = result.filter(s =>
        s.ticker.toLowerCase().includes(q) ||
        s.issuerName.toLowerCase().includes(q) ||
        s.commonTicker.toLowerCase().includes(q)
      );
    }

    if (igOnly) {
      result = result.filter(s => s.isInvestmentGrade);
    }

    if (cumOnly) {
      result = result.filter(s => s.dividendType === 'cumulative');
    }

    if (selectedSectors.length > 0) {
      result = result.filter(s => selectedSectors.includes(s.sector));
    }

    return result;
  }, [stocks, globalFilter, igOnly, cumOnly, selectedSectors]);

  const table = useReactTable({
    data: filteredStocks,
    columns: STOCK_COLUMNS,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const toggleSector = (sector: PreferredSector) => {
    setSelectedSectors(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  const clearFilters = () => {
    setGlobalFilter('');
    setIgOnly(false);
    setCumOnly(false);
    setSelectedSectors([]);
  };

  const hasFilters = globalFilter || igOnly || cumOnly || selectedSectors.length > 0;

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search ticker, issuer..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="h-8 w-56 text-xs"
          />
          <Button
            variant={igOnly ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setIgOnly(!igOnly)}
          >
            IG Only
          </Button>
          <Button
            variant={cumOnly ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setCumOnly(!cumOnly)}
          >
            Cumulative Only
          </Button>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={clearFilters}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredStocks.length} securities
          </span>
        </div>
        {/* Sector filters */}
        <div className="flex gap-1 flex-wrap">
          {SECTORS.map(sector => (
            <button
              key={sector}
              onClick={() => toggleSector(sector)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                selectedSectors.includes(sector)
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
              }`}
            >
              {SECTOR_LABELS[sector]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[calc(100vh-260px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() }}
                    className="py-2 px-2 whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={STOCK_COLUMNS.length} className="text-center py-12 text-muted-foreground text-sm">
                  {stocks.length === 0
                    ? 'No data yet. Trigger a data refresh to populate the dashboard.'
                    : 'No securities match the current filters.'}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/50 cursor-pointer"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      className="py-1.5 px-2"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
