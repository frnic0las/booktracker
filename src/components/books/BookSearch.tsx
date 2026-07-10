'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AddBookSheet } from '@/components/books/AddBookSheet';
import { BarcodeScanner } from '@/components/books/BarcodeScanner';
import { IsbnEntrySheet } from '@/components/books/IsbnEntrySheet';
import { SearchFilters, isValidLang } from '@/components/books/SearchFilters';
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
  const [lang, setLang] = useState('');
  const [author, setAuthor] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const debouncedQuery = useDebounce(query.trim(), 300);
  const debouncedLang = useDebounce(lang, 300);
  const debouncedAuthor = useDebounce(author.trim(), 300);

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

      const params = new URLSearchParams({ q: debouncedQuery });

      if (isValidLang(debouncedLang)) {
        params.set('lang', debouncedLang);
      }

      if (debouncedAuthor) {
        params.set('author', debouncedAuthor);
      }

      try {
        const response = await fetch(`/api/books/search?${params.toString()}`, {
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
  }, [debouncedQuery, debouncedLang, debouncedAuthor]);

  function handleSelect(result: BookSearchResult): void {
    setSelected(result);
    setSheetOpen(true);
  }

  // An ISBN from the scanner or manual entry reuses the debounced search path:
  // the API resolves a bare ISBN via the isbn: field operator.
  function handleIsbn(isbn: string): void {
    setScannerOpen(false);
    setManualOpen(false);
    setQuery(isbn);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="px-4 pb-2.5 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <SearchBar
          value={query}
          onChange={setQuery}
          onCancel={() => router.push(`/${from}`)}
          onScan={() => setScannerOpen(true)}
          placeholder="Title, author, or ISBN"
        />
      </div>

      <SearchFilters
        lang={lang}
        author={author}
        onLangChange={setLang}
        onAuthorChange={setAuthor}
      />

      <div className="flex-1 overflow-y-auto">
        {!debouncedQuery ? (
          <EmptyState
            title="Search for a book"
            description="Search for a title or author to get started."
            action={
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-separator bg-surface-1 px-5 text-[15px] font-semibold text-accent"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <path d="M7 8v8M10 8v8M13 8v8M17 8v8" />
                </svg>
                Scan barcode
              </button>
            }
          />
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

      {scannerOpen ? (
        <BarcodeScanner
          onDetected={handleIsbn}
          onCancel={() => setScannerOpen(false)}
          onManualEntry={() => {
            setScannerOpen(false);
            setManualOpen(true);
          }}
        />
      ) : null}

      <IsbnEntrySheet open={manualOpen} onClose={() => setManualOpen(false)} onSubmit={handleIsbn} />
    </div>
  );
}
