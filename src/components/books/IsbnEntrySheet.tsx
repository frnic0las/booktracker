'use client';

import { useState } from 'react';

import { Sheet } from '@/components/ui/Sheet';
import { isValidIsbn, normalizeIsbn } from '@/lib/books/isbn';

export interface IsbnEntrySheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (isbn: string) => void;
}

// Digits, plus a trailing X for ISBN-10 check digits.
function sanitize(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase().slice(0, 13);
}

export function IsbnEntrySheet({ open, onClose, onSubmit }: IsbnEntrySheetProps): React.JSX.Element {
  const [value, setValue] = useState('');

  const canSearch = isValidIsbn(value);
  const showError = (value.length === 10 || value.length === 13) && !canSearch;

  function handleSearch(): void {
    const isbn = normalizeIsbn(value);

    if (!isbn) {
      return;
    }

    onSubmit(isbn);
    setValue('');
  }

  function handleClose(): void {
    setValue('');
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose}>
      <div className="-mt-1 flex items-center justify-between pb-1">
        <button type="button" onClick={handleClose} className="min-h-11 px-1 text-base text-accent">
          Cancel
        </button>
        <span className="text-[17px] font-bold text-primary">Enter ISBN</span>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!canSearch}
          className="min-h-11 px-1 text-base font-semibold text-accent disabled:opacity-40"
        >
          Search
        </button>
      </div>

      <label htmlFor="isbn-input" className="mt-2 mb-2 block px-1 text-xs font-semibold uppercase tracking-wide text-secondary">
        ISBN-13 or ISBN-10
      </label>
      <input
        id="isbn-input"
        value={value}
        onChange={(event) => setValue(sanitize(event.target.value))}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        aria-label="ISBN"
        placeholder="9780441013593"
        className="w-full rounded-[10px] border border-separator bg-surface-1 px-4 py-3.5 font-mono text-xl tracking-[2px] text-primary outline-none placeholder:text-tertiary focus:border-transparent focus:outline focus:outline-2 focus:outline-accent"
      />

      {showError ? (
        <p className="mt-2.5 px-1 text-[13px] text-destructive">
          That ISBN doesn&apos;t look right. Check the digits and try again.
        </p>
      ) : (
        <p className="mt-2.5 px-1 text-[13px] leading-snug text-tertiary">
          Found under the barcode on the back cover. Digits only — enter all 10 or 13.
        </p>
      )}
    </Sheet>
  );
}
