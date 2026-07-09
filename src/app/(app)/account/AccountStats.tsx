'use client';

import { useEffect, useState } from 'react';

import type { BookStats, ReadingStatus } from '@/types/books';

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

const STATUS_ORDER: ReadingStatus[] = ['reading', 'read', 'want_to_read'];

const numberFormat = new Intl.NumberFormat('en-US');

function formatCount(value: number): string {
  return numberFormat.format(value);
}

interface CategoryCardProps {
  title: string;
  stats: { reading: number; read: number; want_to_read: number };
}

function CategoryCard({ title, stats }: CategoryCardProps): React.JSX.Element {
  return (
    <div>
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-tertiary">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-separator bg-surface-1">
        {STATUS_ORDER.map((status, index) => (
          <div
            key={status}
            className={
              index > 0
                ? 'flex items-center gap-2.5 border-t border-separator px-4 py-3.5'
                : 'flex items-center gap-2.5 px-4 py-3.5'
            }
          >
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[status]}`} />
            <span className="flex-1 text-[15px] font-medium text-primary">{STATUS_LABELS[status]}</span>
            <span className="text-[15px] font-semibold text-secondary">{stats[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccountStats(): React.JSX.Element {
  const [stats, setStats] = useState<BookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats(): Promise<void> {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch('/api/stats', { signal: controller.signal });

        if (!response.ok) {
          setError(true);
          return;
        }

        const data = (await response.json()) as BookStats;
        setStats(data);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadStats();

    return () => controller.abort();
  }, [reloadKey]);

  if (loading) {
    return <p className="py-16 text-center text-sm text-secondary">Loading…</p>;
  }

  if (error || !stats) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-secondary">Couldn&apos;t load your stats. Pull to retry.</p>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="mt-2 text-sm font-semibold text-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-separator bg-surface-1">
        <div className="grid grid-cols-2">
          <div className="flex min-w-0 flex-col items-center px-4 py-5">
            <p className="flex h-10 items-end whitespace-nowrap text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-primary">
              {formatCount(stats.total)}
            </p>
            <p className="mt-2 whitespace-nowrap text-[13px] font-semibold uppercase tracking-wide text-tertiary">
              Total books
            </p>
          </div>
          <div className="flex min-w-0 flex-col items-center border-l border-separator px-4 py-5">
            <p className="flex h-10 items-end whitespace-nowrap text-[28px] font-bold leading-none tracking-tight tabular-nums text-secondary">
              {formatCount(stats.totalPagesRead)}
            </p>
            <p className="mt-2 whitespace-nowrap text-[13px] font-semibold uppercase tracking-wide text-tertiary">
              Pages read
            </p>
          </div>
        </div>
      </div>

      <CategoryCard title="Novels" stats={stats.novels} />
      <CategoryCard title="Non-Fiction" stats={stats.non_fiction} />
    </div>
  );
}
