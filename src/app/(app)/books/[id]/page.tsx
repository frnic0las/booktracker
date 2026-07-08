import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { requireUserId } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { books, userBooks } from '@/lib/db/schema';
import { mapRowToLibraryEntry } from '@/lib/books/mappers';
import { BookDetail } from '@/components/books/BookDetail';

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const userId = await requireUserId();

  if (!userId) {
    notFound();
  }

  const { id } = await params;

  let row: { userBook: typeof userBooks.$inferSelect; book: typeof books.$inferSelect } | undefined;

  try {
    [row] = await db
      .select({ userBook: userBooks, book: books })
      .from(userBooks)
      .innerJoin(books, eq(userBooks.bookId, books.id))
      .where(and(eq(userBooks.id, id), eq(userBooks.userId, userId)))
      .limit(1);
  } catch (error) {
    console.error('Failed to fetch book:', error);
    notFound();
  }

  if (!row) {
    notFound();
  }

  const entry = mapRowToLibraryEntry(row);

  return <BookDetail entry={entry} />;
}
