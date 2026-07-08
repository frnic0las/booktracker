'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { BookGrid } from '@/components/books/BookGrid';
import { SubTabs, type SubTab } from '@/components/ui/SubTabs';
import type { BookCategory, LibraryEntry, ReadingStatus } from '@/types/books';

const STATUS_TABS: SubTab<ReadingStatus>[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
  { value: 'want_to_read', label: 'Want to Read' },
];

const EMPTY_COPY: Record<ReadingStatus, { title: string; description: string }> = {
  reading: {
    title: 'Nothing here yet',
    description: "Books you're reading will show up here. Search and add your first one.",
  },
  read: {
    title: 'Nothing here yet',
    description: "Books you've finished will show up here. Search and add your first one.",
  },
  want_to_read: {
    title: 'Nothing here yet',
    description: 'Books you want to read will show up here. Search and add your first one.',
  },
};

interface LibraryPageProps {
  category: BookCategory;
  title: string;
  from: string;
}

export function LibraryPage({ category, title, from }: LibraryPageProps): React.JSX.Element {
  const [status, setStatus] = useState<ReadingStatus>('reading');
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBooks(): Promise<void> {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(`/api/books?category=${category}&status=${status}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setError(true);
          return;
        }

        const data = (await response.json()) as { books: LibraryEntry[] };
        setEntries(data.books);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadBooks();

    return () => controller.abort();
  }, [category, status, reloadKey]);

  const emptyCopy = EMPTY_COPY[status];

  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-2.5 pt-1">
        <h1 className="text-[32px] font-extrabold tracking-tight text-primary">{title}</h1>
        <Link href={`/search?from=${from}`} aria-label="Add book" className="p-[5px]">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-2 text-[22px] leading-none text-accent">
            +
          </span>
        </Link>
      </div>

      <div className="px-4 pb-3.5 pt-1.5">
        <SubTabs tabs={STATUS_TABS} value={status} onChange={setStatus} />
      </div>

      <div className="px-4">
        {loading ? (
          <p className="py-16 text-center text-sm text-secondary">Loading…</p>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm text-secondary">Couldn&apos;t load your books. Pull to retry.</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-2 text-sm font-semibold text-accent"
            >
              Retry
            </button>
          </div>
        ) : (
          <BookGrid
            entries={entries}
            addHref={`/search?from=${from}`}
            emptyTitle={emptyCopy.title}
            emptyDescription={emptyCopy.description}
          />
        )}
      </div>
    </div>
  );
}
