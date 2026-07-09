import Image from 'next/image';
import Link from 'next/link';

import type { BookRating } from '@/types/books';

export interface BookCardProps {
  id: string;
  title: string;
  authors: string[];
  thumbnail: string | null;
  rating: BookRating | null;
  abandoned: boolean;
}

const RATING_EMOJI: Record<BookRating, string> = {
  good: '👍',
  average: '😐',
  bad: '👎',
};

const RATING_LABEL: Record<BookRating, string> = {
  good: 'Rated good',
  average: 'Rated average',
  bad: 'Rated bad',
};

function DnfStrip(): React.JSX.Element {
  return (
    <div className="absolute inset-x-0 bottom-0 z-[3] bg-abandoned py-[3px] text-center text-[9px] font-extrabold tracking-[0.08em] text-background">
      <span className="sr-only">Did not finish</span>
      <span aria-hidden="true">DNF</span>
    </div>
  );
}

function RatingChip({ rating }: { rating: BookRating }): React.JSX.Element {
  return (
    <span className="absolute right-[5px] top-[5px] z-[3] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/15 bg-black/70 text-xs backdrop-blur-[6px]">
      <span className="sr-only">{RATING_LABEL[rating]}</span>
      <span aria-hidden="true">{RATING_EMOJI[rating]}</span>
    </span>
  );
}

export function BookCard({ id, title, authors, thumbnail, rating, abandoned }: BookCardProps): React.JSX.Element {
  const author = authors[0];

  return (
    <Link href={`/books/${id}`} className="flex flex-col gap-1.5">
      {thumbnail ? (
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 shadow-md">
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 430px) 33vw, 130px"
            className="object-cover"
          />
          {abandoned ? <div className="absolute inset-0 bg-black/50" /> : null}
          {rating ? <RatingChip rating={rating} /> : null}
          {abandoned ? <DnfStrip /> : null}
        </div>
      ) : (
        <div className="relative flex aspect-[2/3] flex-col items-center justify-center overflow-hidden rounded-lg border border-separator bg-gradient-to-br from-surface-2 to-surface-1 p-2.5 text-center shadow-md">
          <p className="line-clamp-4 text-xs font-bold leading-tight text-primary">{title}</p>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="mt-2 text-tertiary"
          >
            <path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z" />
            <path d="M18 6h2v14H6" />
          </svg>
          {abandoned ? <div className="absolute inset-0 bg-black/50" /> : null}
          {rating ? <RatingChip rating={rating} /> : null}
          {abandoned ? <DnfStrip /> : null}
        </div>
      )}
      <div>
        <p className="line-clamp-2 text-xs font-semibold leading-tight text-primary">{title}</p>
        {author ? <p className="mt-px truncate text-[11px] text-secondary">{author}</p> : null}
      </div>
    </Link>
  );
}
