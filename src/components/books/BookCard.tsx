import Image from 'next/image';
import Link from 'next/link';

export interface BookCardProps {
  id: string;
  title: string;
  authors: string[];
  thumbnail: string | null;
}

export function BookCard({ id, title, authors, thumbnail }: BookCardProps): React.JSX.Element {
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
        </div>
      ) : (
        <div className="relative flex aspect-[2/3] flex-col items-center justify-center rounded-lg border border-separator bg-gradient-to-br from-surface-2 to-surface-1 p-2.5 text-center shadow-md">
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
        </div>
      )}
      <div>
        <p className="line-clamp-2 text-xs font-semibold leading-tight text-primary">{title}</p>
        {author ? <p className="mt-px truncate text-[11px] text-secondary">{author}</p> : null}
      </div>
    </Link>
  );
}
