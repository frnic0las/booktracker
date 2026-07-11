export function SearchResultSkeleton(): React.JSX.Element {
  return (
    <div className="px-4 pt-2.5" role="status" aria-busy="true" aria-label="Searching">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-separator py-2.5 last:border-b-0">
          <div className="aspect-[2/3] w-11 shrink-0 animate-pulse rounded-md bg-surface-1" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-surface-1" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-1" />
            <div className="h-2 w-1/4 animate-pulse rounded bg-surface-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
