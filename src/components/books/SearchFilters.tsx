'use client';

import { useState } from 'react';

export interface SearchFiltersProps {
  lang: string;
  author: string;
  onLangChange: (lang: string) => void;
  onAuthorChange: (author: string) => void;
}

interface Language {
  label: string;
  code: string;
}

const LANGUAGES: readonly Language[] = [
  { label: 'All', code: '' },
  { label: 'English', code: 'en' },
  { label: 'French', code: 'fr' },
  { label: 'Spanish', code: 'es' },
  { label: 'German', code: 'de' },
];

const PANEL_ID = 'search-filters-panel';

// The proxy 400s on anything outside this shape, so a partial code is treated
// as no language filter at all.
export function isValidLang(lang: string): boolean {
  return /^[a-z]{2}$/.test(lang);
}

function langChipLabel(lang: string): string {
  return LANGUAGES.find((language) => language.code === lang)?.label ?? lang.toUpperCase();
}

export function SearchFilters({
  lang,
  author,
  onLangChange,
  onAuthorChange,
}: SearchFiltersProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [otherMode, setOtherMode] = useState(
    () => lang !== '' && !LANGUAGES.some((language) => language.code === lang),
  );
  const [isoBlurred, setIsoBlurred] = useState(false);

  const trimmedAuthor = author.trim();
  const langActive = isValidLang(lang);
  const activeCount = (langActive ? 1 : 0) + (trimmedAuthor ? 1 : 0);
  const isoInvalid = otherMode && isoBlurred && lang.length === 1;

  function selectLanguage(code: string): void {
    setOtherMode(false);
    setIsoBlurred(false);
    onLangChange(code);
  }

  function selectOther(): void {
    setOtherMode(true);
    setIsoBlurred(false);
    onLangChange('');
  }

  function clearLanguage(): void {
    setOtherMode(false);
    setIsoBlurred(false);
    onLangChange('');
  }

  function clearAll(): void {
    clearLanguage();
    onAuthorChange('');
  }

  const togglePillClass =
    activeCount > 0
      ? 'border-accent/45 bg-accent/15 text-accent'
      : open
        ? 'border-separator bg-surface-2 text-primary'
        : 'border-separator bg-surface-1 text-secondary';

  return (
    <div className="px-4 pb-2.5">
      <div className="flex min-h-[44px] items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          className="inline-flex h-[44px] shrink-0 items-center"
        >
          <span
            className={`inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${togglePillClass}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16" />
              <path d="M7 12h10" />
              <path d="M10 18h4" />
            </svg>
            Filters
            {activeCount > 0 ? (
              <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {activeCount}
              </span>
            ) : null}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={open ? 'rotate-180' : undefined}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>

        {!open && activeCount > 0 ? (
          <>
            <div className="-my-[7px] flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-[7px]">
              {langActive ? (
                <FilterChip
                  label={langChipLabel(lang)}
                  dismissLabel="Clear language filter"
                  onDismiss={clearLanguage}
                />
              ) : null}
              {trimmedAuthor ? (
                <FilterChip
                  label={trimmedAuthor}
                  dismissLabel="Clear author filter"
                  onDismiss={() => onAuthorChange('')}
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="min-h-[44px] shrink-0 px-1.5 text-[13px] font-semibold text-accent"
            >
              Clear
            </button>
          </>
        ) : null}
      </div>

      {open ? (
        <div
          id={PANEL_ID}
          className="mt-2.5 space-y-4 rounded-xl border border-separator bg-surface-1 p-3.5"
        >
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Language</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Language">
              {LANGUAGES.map((language) => (
                <LangChip
                  key={language.label}
                  label={language.label}
                  selected={!otherMode && lang === language.code}
                  onClick={() => selectLanguage(language.code)}
                />
              ))}
              <LangChip label="Other" selected={otherMode} onClick={selectOther} />
            </div>

            {otherMode ? (
              <div className="mt-2.5">
                <div className="flex min-h-[44px] max-w-[130px] items-center gap-2 rounded-[10px] border border-separator bg-background px-3 focus-within:border-transparent focus-within:outline focus-within:outline-2 focus-within:outline-accent">
                  <input
                    value={lang}
                    onChange={(event) => onLangChange(event.target.value.toLowerCase().slice(0, 2))}
                    onBlur={() => setIsoBlurred(true)}
                    maxLength={2}
                    inputMode="text"
                    autoCapitalize="off"
                    autoCorrect="off"
                    aria-label="Language code"
                    aria-invalid={isoInvalid}
                    className="min-w-0 flex-1 bg-transparent text-[15px] lowercase text-primary outline-none"
                  />
                </div>
                <p className={`mt-1.5 text-xs ${isoInvalid ? 'text-destructive' : 'text-tertiary'}`}>
                  {isoInvalid
                    ? 'Enter a two-letter ISO 639-1 code.'
                    : 'Two-letter ISO 639-1 code — e.g. it, pt, ja.'}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Author</p>
            <div className="flex min-h-[44px] items-center gap-2 rounded-[10px] border border-separator bg-background px-3 focus-within:border-transparent focus-within:outline focus-within:outline-2 focus-within:outline-accent">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-tertiary"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <input
                value={author}
                onChange={(event) => onAuthorChange(event.target.value)}
                placeholder="Filter by author..."
                aria-label="Filter by author"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-primary outline-none placeholder:text-tertiary"
              />
              {author ? (
                <button
                  type="button"
                  onClick={() => onAuthorChange('')}
                  aria-label="Clear author filter"
                  className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tertiary text-background after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface LangChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function LangChip({ label, selected, onClick }: LangChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-full border px-3.5 text-sm font-semibold ${
        selected ? 'border-accent bg-accent text-white' : 'border-separator bg-surface-2 text-secondary'
      }`}
    >
      {label}
    </button>
  );
}

interface FilterChipProps {
  label: string;
  dismissLabel: string;
  onDismiss: () => void;
}

function FilterChip({ label, dismissLabel, onDismiss }: FilterChipProps): React.JSX.Element {
  return (
    <span className="inline-flex h-[30px] max-w-[160px] shrink-0 items-center gap-1.5 rounded-full border border-separator bg-surface-2 pl-2.5 pr-1.5 text-xs font-semibold text-primary">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-secondary after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </span>
  );
}
