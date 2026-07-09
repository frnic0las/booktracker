'use client';

import { cn } from '@/lib/utils';
import type { BookRating } from '@/types/books';

export interface RatingPickerProps {
  value: BookRating | null;
  onChange: (rating: BookRating | null) => void;
  disabled?: boolean;
}

interface RatingOption {
  value: BookRating;
  label: string;
  icon: string;
}

const RATING_OPTIONS: RatingOption[] = [
  { value: 'good', label: 'Good', icon: '👍' },
  { value: 'average', label: 'Average', icon: '😐' },
  { value: 'bad', label: 'Bad', icon: '👎' },
];

export function RatingPicker({ value, onChange, disabled }: RatingPickerProps): React.JSX.Element {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-tertiary">Your rating</p>
      <div role="group" aria-label="Rating" className="grid grid-cols-3 gap-[3px] rounded-[10px] bg-surface-2 p-[3px]">
        {RATING_OPTIONS.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              onClick={() => onChange(isActive ? null : option.value)}
              className={cn(
                'flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1 py-[9px] text-[13px] font-semibold disabled:opacity-60',
                isActive ? 'bg-background text-primary shadow-sm' : 'text-secondary',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('text-[15px] leading-none', isActive ? 'grayscale-0 opacity-100' : 'grayscale opacity-65')}
              >
                {option.icon}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
