'use client';

import { cn } from '@/lib/utils';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  dotClass?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

const COLS_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>): React.JSX.Element {
  const colsClass = COLS_CLASS[options.length] ?? 'grid-cols-3';

  return (
    <div className={cn('grid gap-[3px] rounded-[10px] bg-surface-2 p-[3px]', colsClass)}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'whitespace-nowrap rounded-lg px-1 py-[9px] text-[13px] font-semibold',
              isActive ? 'bg-background text-primary shadow-sm' : 'text-secondary',
            )}
          >
            {option.dotClass && isActive ? (
              <span className={cn('mr-[5px] inline-block h-[7px] w-[7px] rounded-full align-middle', option.dotClass)} />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
