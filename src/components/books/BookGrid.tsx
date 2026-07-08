import Link from 'next/link';

import { BookCard } from '@/components/books/BookCard';
import type { LibraryEntry } from '@/types/books';

export interface BookGridProps {
  entries: LibraryEntry[];
  emptyTitle: string;
  emptyDescription: string;
  addHref: string;
}

export function BookGrid({ entries, emptyTitle, emptyDescription, addHref }: BookGridProps): React.JSX.Element {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3.5 px-10 py-16 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-separator bg-surface-1 text-tertiary">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4V5.5z" />
            <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6V5.5z" />
          </svg>
        </div>
        <h3 className="text-[17px] font-bold text-primary">{emptyTitle}</h3>
        <p className="max-w-[240px] text-sm leading-snug text-secondary">{emptyDescription}</p>
        <Link href={addHref} className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-semibold text-white">
          + Add a book
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-4">
      {entries.map((entry) => (
        <BookCard
          key={entry.userBookId}
          id={entry.userBookId}
          title={entry.book.title}
          authors={entry.book.authors}
          thumbnail={entry.book.thumbnail}
        />
      ))}
    </div>
  );
}
