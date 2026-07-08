'use client';

import { useState } from 'react';
import Image from 'next/image';

import { addBook } from '@/actions/books';
import { Sheet } from '@/components/ui/Sheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { BookCategory, BookSearchResult, ReadingStatus } from '@/types/books';

export interface AddBookSheetProps {
  result: BookSearchResult | null;
  initialCategory: BookCategory;
  open: boolean;
  onClose: () => void;
  onKeepSearching: () => void;
  onDone: () => void;
}

const CATEGORY_OPTIONS: { value: BookCategory; label: string }[] = [
  { value: 'novel', label: 'Novel' },
  { value: 'non_fiction', label: 'Non-Fiction' },
];

const STATUS_OPTIONS: { value: ReadingStatus; label: string; dotClass: string }[] = [
  { value: 'reading', label: 'Reading', dotClass: 'bg-reading' },
  { value: 'read', label: 'Read', dotClass: 'bg-read' },
  { value: 'want_to_read', label: 'Want', dotClass: 'bg-want' },
];

function getYear(publishedDate: string | null): string | null {
  return publishedDate ? publishedDate.slice(0, 4) : null;
}

function BookThumbnail({ result }: { result: BookSearchResult }): React.JSX.Element {
  if (result.coverUrl) {
    return (
      <div className="relative aspect-[2/3] w-[50px] shrink-0 overflow-hidden rounded-md bg-surface-2 shadow-sm">
        <Image src={result.coverUrl} alt="" fill sizes="50px" className="object-cover" />
      </div>
    );
  }

  return (
    <div className="flex aspect-[2/3] w-[50px] shrink-0 items-center justify-center rounded-md border border-separator bg-gradient-to-br from-surface-2 to-surface-1 text-tertiary">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z" />
        <path d="M18 6h2v14H6" />
      </svg>
    </div>
  );
}

export function AddBookSheet({
  result,
  initialCategory,
  open,
  onClose,
  onKeepSearching,
  onDone,
}: AddBookSheetProps): React.JSX.Element {
  const [category, setCategory] = useState<BookCategory>(initialCategory);
  const [status, setStatus] = useState<ReadingStatus>('reading');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  if (!result) {
    return <Sheet open={open} onClose={onClose}><div /></Sheet>;
  }

  const author = result.authors[0];
  const year = getYear(result.publishedDate);
  const subtitle = [author, year].filter(Boolean).join(' · ');

  async function handleConfirm(): Promise<void> {
    if (!result) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const outcome = await addBook(result.id, category, status);

      if (!outcome.success) {
        setError(outcome.error);
        return;
      }

      setAdded(true);
    } catch {
      setError('Failed to add book');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      {added ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-read/15 text-read">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-[17px] font-bold text-primary">Added to library</h3>
          <p className="text-sm text-secondary">{result.title} is now in your library.</p>
          <div className="mt-2 flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={onKeepSearching}
              className="w-full rounded-[10px] bg-accent py-3.5 text-base font-semibold text-white"
            >
              Keep searching
            </button>
            <button type="button" onClick={onDone} className="w-full rounded-[10px] py-3 text-base font-semibold text-accent">
              Done
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 border-b border-separator pb-4">
            <BookThumbnail result={result} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-tight text-primary">{result.title}</p>
              {subtitle ? <p className="mt-0.5 text-[13px] text-secondary">{subtitle}</p> : null}
            </div>
          </div>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-secondary">Category</p>
          <SegmentedControl options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-secondary">Status</p>
          <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

          {error ? <p className="mt-3 text-center text-[13px] text-secondary">{error}</p> : null}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="mt-[22px] w-full rounded-[10px] bg-accent py-3.5 text-base font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add to library'}
          </button>
        </div>
      )}
    </Sheet>
  );
}
