'use client';

export interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, onCancel, placeholder }: SearchBarProps): React.JSX.Element {
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
      <button type="button" onClick={onCancel} className="whitespace-nowrap text-base text-accent">
        Cancel
      </button>
    </div>
  );
}
