import { BookSearch } from '@/components/books/BookSearch';
import type { BookCategory } from '@/types/books';

const CATEGORY_BY_FROM: Record<string, BookCategory> = {
  novels: 'novel',
  'non-fiction': 'non_fiction',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}): Promise<React.JSX.Element> {
  const { from } = await searchParams;
  const origin = from === 'non-fiction' ? 'non-fiction' : 'novels';
  const initialCategory = CATEGORY_BY_FROM[origin] ?? 'novel';

  return <BookSearch initialCategory={initialCategory} from={origin} />;
}
