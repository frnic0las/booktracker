'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { abandonBook, removeBook, updateBookCategory, updateBookRating, updateBookStatus } from '@/actions/books';
import { RatingPicker } from '@/components/books/RatingPicker';
import { Sheet } from '@/components/ui/Sheet';
import type { BookCategory, BookRating, LibraryEntry, ReadingStatus } from '@/types/books';

export interface BookDetailProps {
  entry: LibraryEntry;
}

interface BackTarget {
  href: string;
  label: string;
}

const BACK_TARGETS: Record<BookCategory, BackTarget> = {
  novel: { href: '/novels', label: 'Novels' },
  non_fiction: { href: '/non-fiction', label: 'Non-Fiction' },
};

const STATUS_LABELS: Record<ReadingStatus, string> = {
  reading: 'Reading',
  read: 'Read',
  want_to_read: 'Want to Read',
};

const STATUS_DOT_CLASS: Record<ReadingStatus, string> = {
  reading: 'bg-reading',
  read: 'bg-read',
  want_to_read: 'bg-want',
};

const STATUS_OPTIONS: ReadingStatus[] = ['reading', 'read', 'want_to_read'];

const CATEGORY_LABELS: Record<BookCategory, string> = {
  novel: 'Novel',
  non_fiction: 'Non-Fiction',
};

const CATEGORY_OPTIONS: BookCategory[] = ['novel', 'non_fiction'];

function ChevronDownIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronLeftIcon(): React.JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XCircleIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </svg>
  );
}

function DnfStrip(): React.JSX.Element {
  return (
    <>
      <div className="absolute inset-0 z-10 bg-black/55" />
      <div className="absolute inset-x-0 bottom-0 z-20 bg-abandoned py-1.5 text-center text-[11px] font-extrabold uppercase tracking-[0.08em] text-background">
        Did Not Finish
      </div>
    </>
  );
}

function HeroCover({
  title,
  thumbnail,
  abandoned,
}: {
  title: string;
  thumbnail: string | null;
  abandoned: boolean;
}): React.JSX.Element {
  if (thumbnail) {
    return (
      <div className="relative mx-auto mb-[18px] mt-1 aspect-[2/3] w-[150px] overflow-hidden rounded-[10px] bg-surface-2 shadow-[0_12px_30px_rgba(0,0,0,0.6)]">
        <Image src={thumbnail} alt="" fill sizes="150px" className="object-cover" />
        {abandoned ? <DnfStrip /> : null}
      </div>
    );
  }

  return (
    <div className="relative mx-auto mb-[18px] mt-1 flex aspect-[2/3] w-[150px] flex-col items-center justify-center overflow-hidden rounded-[10px] border border-separator bg-gradient-to-br from-surface-2 to-surface-1 p-3 text-center shadow-[0_12px_30px_rgba(0,0,0,0.6)]">
      <p className="line-clamp-4 text-sm font-bold leading-tight text-primary">{title}</p>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="mt-2 text-tertiary"
      >
        <path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z" />
        <path d="M18 6h2v14H6" />
      </svg>
      {abandoned ? <DnfStrip /> : null}
    </div>
  );
}

export function BookDetail({ entry }: BookDetailProps): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState<ReadingStatus>(entry.status);
  const [category, setCategory] = useState<BookCategory>(entry.category);
  const [abandoned, setAbandoned] = useState(entry.abandoned);
  const [rating, setRating] = useState<BookRating | null>(entry.rating);
  const [statusOpen, setStatusOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { book } = entry;
  const backTarget = BACK_TARGETS[category];

  async function handleSelectStatus(value: ReadingStatus): Promise<void> {
    if (value === status) {
      setStatusOpen(false);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const outcome = await updateBookStatus(entry.userBookId, value);

      if (!outcome.success) {
        setError(outcome.error);
        return;
      }

      setStatus(value);
      setAbandoned(value === 'read' ? abandoned : false);
      setStatusOpen(false);
      router.refresh();
    } catch {
      setError('Failed to update status');
    } finally {
      setPending(false);
    }
  }

  async function handleAbandon(): Promise<void> {
    setPending(true);
    setError(null);

    try {
      const outcome = await abandonBook(entry.userBookId);

      if (!outcome.success) {
        setError(outcome.error);
        return;
      }

      setStatus('read');
      setAbandoned(true);
      setStatusOpen(false);
      router.refresh();
    } catch {
      setError('Failed to abandon book');
    } finally {
      setPending(false);
    }
  }

  async function handleSelectRating(value: BookRating | null): Promise<void> {
    const previous = rating;
    setRating(value);
    setPending(true);
    setError(null);

    try {
      const outcome = await updateBookRating(entry.userBookId, value);

      if (!outcome.success) {
        setError(outcome.error);
        setRating(previous);
        return;
      }

      router.refresh();
    } catch {
      setError('Failed to update rating');
      setRating(previous);
    } finally {
      setPending(false);
    }
  }

  async function handleSelectCategory(value: BookCategory): Promise<void> {
    if (value === category) {
      setCategoryOpen(false);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const outcome = await updateBookCategory(entry.userBookId, value);

      if (!outcome.success) {
        setError(outcome.error);
        return;
      }

      setCategory(value);
      setCategoryOpen(false);
      router.refresh();
    } catch {
      setError('Failed to update category');
    } finally {
      setPending(false);
    }
  }

  async function handleRemove(): Promise<void> {
    setPending(true);
    setError(null);

    try {
      const outcome = await removeBook(entry.userBookId);

      if (!outcome.success) {
        setError(outcome.error);
        return;
      }

      router.push(backTarget.href);
      router.refresh();
    } catch {
      setError('Failed to remove book');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-11 shrink-0 items-center px-3">
        <Link href={backTarget.href} className="flex items-center gap-0.5 text-base text-accent">
          <ChevronLeftIcon />
          {backTarget.label}
        </Link>
      </div>

      <div className="px-5 pb-6 pt-2 text-center">
        <HeroCover title={book.title} thumbnail={book.thumbnail} abandoned={abandoned} />

        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-primary">{book.title}</h1>

        {book.authors.length > 0 ? (
          <p className="mt-1.5 text-[15px] text-secondary">{book.authors.join(', ')}</p>
        ) : null}

        <div className="my-4 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setStatusOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[13px] font-semibold ${
              abandoned ? 'border-abandoned/45 bg-abandoned/15 text-abandoned' : 'border-separator bg-surface-1 text-primary'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${abandoned ? 'bg-abandoned' : STATUS_DOT_CLASS[status]}`} />
            {abandoned ? 'Abandoned' : STATUS_LABELS[status]}
            <span className="text-tertiary">
              <ChevronDownIcon />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-separator bg-surface-1 px-3.5 py-[7px] text-[13px] font-semibold text-primary"
          >
            {CATEGORY_LABELS[category]}
            <span className="text-tertiary">
              <ChevronDownIcon />
            </span>
          </button>
        </div>

        {status === 'read' ? (
          <div className="mb-[18px] text-left">
            <RatingPicker value={rating} onChange={handleSelectRating} disabled={pending} />
          </div>
        ) : null}

        <div className="mb-[18px] grid grid-cols-3 overflow-hidden rounded-xl border border-separator bg-surface-1">
          <div className="px-1.5 py-3 text-center">
            <p className="text-base font-bold text-primary">{book.pageCount ?? '—'}</p>
            <p className="mt-[3px] text-[11px] uppercase tracking-wide text-tertiary">Pages</p>
          </div>
          <div className="border-l border-separator px-1.5 py-3 text-center">
            <p className="text-base font-bold text-primary">
              {book.publishedDate ? book.publishedDate.slice(0, 4) : '—'}
            </p>
            <p className="mt-[3px] text-[11px] uppercase tracking-wide text-tertiary">Year</p>
          </div>
          <div className="border-l border-separator px-1.5 py-3 text-center">
            <p className="text-base font-bold text-primary">{book.isbn13 ?? '—'}</p>
            <p className="mt-[3px] text-[11px] uppercase tracking-wide text-tertiary">ISBN</p>
          </div>
        </div>

        {book.description ? (
          <p className="mb-6 text-left text-sm leading-relaxed text-secondary">{book.description}</p>
        ) : null}

        {error ? <p className="mb-3 text-center text-[13px] text-secondary">{error}</p> : null}

        <button
          type="button"
          onClick={() => setRemoveOpen(true)}
          className="w-full rounded-[10px] border border-destructive/35 py-3 text-[15px] font-semibold text-destructive"
        >
          Remove from library
        </button>
      </div>

      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)}>
        <h3 className="mb-1 text-[17px] font-bold text-primary">Update status</h3>
        <div className="flex flex-col">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              disabled={pending}
              onClick={() => handleSelectStatus(option)}
              className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-60"
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[option]}`} />
              <span className="flex-1 text-[15px] font-medium text-primary">{STATUS_LABELS[option]}</span>
              {option === status ? <span className="text-accent"><CheckIcon /></span> : null}
            </button>
          ))}
          {status === 'reading' ? (
            <>
              <div className="my-1.5 h-px bg-separator" />
              <button
                type="button"
                disabled={pending}
                onClick={handleAbandon}
                className="flex w-full items-center gap-3 py-3 text-left font-semibold text-destructive disabled:opacity-60"
              >
                <XCircleIcon />
                <span className="flex-1 text-[15px]">Abandon</span>
              </button>
              <p className="pb-0.5 text-xs text-tertiary">Marks the book as read and flags it Did Not Finish.</p>
            </>
          ) : null}
        </div>
      </Sheet>

      <Sheet open={categoryOpen} onClose={() => setCategoryOpen(false)}>
        <h3 className="mb-1 text-[17px] font-bold text-primary">Update category</h3>
        <div className="flex flex-col">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              disabled={pending}
              onClick={() => handleSelectCategory(option)}
              className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-60"
            >
              <span className="flex-1 text-[15px] font-medium text-primary">{CATEGORY_LABELS[option]}</span>
              {option === category ? <span className="text-accent"><CheckIcon /></span> : null}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={removeOpen} onClose={() => setRemoveOpen(false)}>
        <h3 className="mb-1 text-[17px] font-bold text-primary">Remove from library?</h3>
        <p className="mb-4 text-sm text-secondary">&ldquo;{book.title}&rdquo; will be removed from your library.</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={handleRemove}
            className="w-full rounded-[10px] bg-destructive py-3.5 text-base font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Removing…' : 'Remove'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRemoveOpen(false)}
            className="w-full py-3 text-base font-semibold text-accent disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
