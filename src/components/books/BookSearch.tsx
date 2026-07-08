'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AddBookSheet } from '@/components/books/AddBookSheet';
import { SearchResultRow } from '@/components/books/SearchResultRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchBar } from '@/components/ui/SearchBar';
import { useDebounce } from '@/hooks/useDebounce';
import type { BookCategory, BookSearchResult } from '@/types/books';

export interface BookSearchProps {
  initialCategory: BookCategory;
  from: string;
}

export function BookSearch({ initialCategory, from }: BookSearchProps): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const debouncedQuery = useDebounce(query.trim(), 300);

  useEffect(() => {
    const controller = new AbortController();

    async function search(): Promise<void> {
      if (!debouncedQuery) {
        setResults([]);
        setLoading(false);
        setError(false);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setError(true);
          return;
        }

        const data = (await response.json()) as { results: BookSearchResult[] };
        setResults(data.results);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    }

    void search();

    return () => controller.abort();
  }, [debouncedQuery]);

  function handleSelect(result: BookSearchResult): void {
    setSelected(result);
    setSheetOpen(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="px-4 pb-2.5 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <SearchBar
          value={query}
          onChange={setQuery}
          onCancel={() => router.push(`/${from}`)}
          placeholder="Title or author"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {!debouncedQuery ? (
          <EmptyState title="Search for a book" description="Search for a title or author to get started." />
        ) : loading ? (
          <p className="py-16 text-center text-sm text-secondary">Searching…</p>
        ) : error ? (
          <EmptyState title="Something went wrong" description="Couldn't reach Google Books. Try again." />
        ) : results.length === 0 ? (
          <EmptyState
            title="No matches"
            description={`No books found for "${debouncedQuery}". Check your spelling or try a different title or author.`}
          />
        ) : (
          <div>
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-tertiary">
              Google Books · {results.length} results
            </p>
            <div className="px-4 pb-4">
              {results.map((result) => (
                <SearchResultRow key={result.id} result={result} onSelect={() => handleSelect(result)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <AddBookSheet
        key={selected?.id ?? 'none'}
        result={selected}
        initialCategory={initialCategory}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onKeepSearching={() => setSheetOpen(false)}
        onDone={() => router.push(`/${from}`)}
      />
    </div>
  );
}
