'use client';

import { SearchResultRow } from '@/components/books/SearchResultRow';
import type { BookSearchResult, BookSource } from '@/types/books';

export interface SearchResultGroupProps {
  source: BookSource;
  results: BookSearchResult[];
  onSelect: (result: BookSearchResult) => void;
}

export const SOURCE_LABEL: Record<BookSource, string> = {
  openLibrary: 'OpenLibrary',
  googleBooks: 'Google Books',
};

export function SearchResultGroup({ source, results, onSelect }: SearchResultGroupProps): React.JSX.Element {
  return (
    <div>
      <p className="px-4 pb-1.5 pt-2.5 text-xs font-semibold uppercase tracking-wider text-tertiary">
        {SOURCE_LABEL[source]}{' '}
        <span className="font-normal">
          · {results.length} {results.length === 1 ? 'result' : 'results'}
        </span>
      </p>
      <div className="px-4">
        {results.map((result) => (
          <SearchResultRow key={result.id} result={result} onSelect={() => onSelect(result)} />
        ))}
      </div>
    </div>
  );
}
