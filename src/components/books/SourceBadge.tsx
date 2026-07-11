import type { BookSource } from '@/types/books';

export interface SourceBadgeProps {
  source: BookSource;
}

export function SourceBadge({ source }: SourceBadgeProps): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-6 items-center
                 justify-center rounded-md border border-white/20 bg-black/80 px-1.5
                 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm
                 backdrop-blur-sm"
    >
      {source === 'openLibrary' ? 'OL' : 'GB'}
    </span>
  );
}
