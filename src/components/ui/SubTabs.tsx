'use client';

import { cn } from '@/lib/utils';

export interface SubTab<T extends string> {
  value: T;
  label: string;
}

export interface SubTabsProps<T extends string> {
  tabs: SubTab<T>[];
  value: T;
  onChange: (value: T) => void;
}

const COLS_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

export function SubTabs<T extends string>({ tabs, value, onChange }: SubTabsProps<T>): React.JSX.Element {
  const colsClass = COLS_CLASS[tabs.length] ?? 'grid-cols-3';

  return (
    <div className={cn('grid gap-0.5 rounded-[10px] bg-surface-1 p-[3px]', colsClass)}>
      {tabs.map((tab) => {
        const isActive = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              'whitespace-nowrap rounded-lg px-1 py-[7px] text-[13px] font-semibold',
              isActive ? 'bg-surface-2 text-primary shadow-sm' : 'text-secondary',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
