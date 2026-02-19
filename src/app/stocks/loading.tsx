import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingStocks() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="p-2 space-y-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
