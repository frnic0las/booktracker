'use client';

export interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onScan?: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, onCancel, onScan, placeholder }: SearchBarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-1 items-center gap-2 rounded-[10px] bg-surface-1 px-3 py-[9px] focus-within:outline focus-within:outline-2 focus-within:outline-accent">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-tertiary"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label="Search books"
          autoFocus
          className="flex-1 bg-transparent text-base text-primary outline-none placeholder:text-tertiary"
        />
      </div>
      {onScan ? (
        <button
          type="button"
          onClick={onScan}
          aria-label="Scan ISBN barcode"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-accent active:bg-surface-1"
        >
          <svg
            width="24"
            height="24"
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
        </button>
      ) : null}
      <button type="button" onClick={onCancel} className="whitespace-nowrap text-base text-accent">
        Cancel
      </button>
    </div>
  );
}
