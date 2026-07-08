'use client';

import Image from 'next/image';

import type { BookSearchResult } from '@/types/books';

export interface SearchResultRowProps {
  result: BookSearchResult;
  onSelect: () => void;
}

function getYear(publishedDate: string | null): string | null {
  return publishedDate ? publishedDate.slice(0, 4) : null;
}

export function SearchResultRow({ result, onSelect }: SearchResultRowProps): React.JSX.Element {
  const author = result.authors[0];
  const year = getYear(result.publishedDate);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 border-b border-separator py-2.5 text-left last:border-b-0"
    >
      {result.coverUrl ? (
        <div className="relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-md bg-surface-2 shadow-sm">
          <Image src={result.coverUrl} alt="" fill sizes="44px" className="object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[2/3] w-11 shrink-0 items-center justify-center rounded-md border border-separator bg-gradient-to-br from-surface-2 to-surface-1 text-tertiary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z" />
            <path d="M18 6h2v14H6" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-primary">{result.title}</p>
        {author ? <p className="mt-0.5 truncate text-[13px] text-secondary">{author}</p> : null}
        {year ? <p className="mt-0.5 text-xs text-tertiary">{year}</p> : null}
      </div>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0 text-tertiary"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
