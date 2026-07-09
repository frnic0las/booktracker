import { toHttps } from "@/lib/google-books/client";
import type { books, userBooks } from "@/lib/db/schema";
import type { Book, BookSearchResult, GoogleBooksVolume, LibraryEntry } from "@/types/books";

type BookRow = typeof books.$inferSelect;
type UserBookRow = typeof userBooks.$inferSelect;

export function parseAuthors(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((a): a is string => typeof a === "string") : [];
  } catch {
    return [];
  }
}

export function serializeAuthors(authors: string[]): string {
  return JSON.stringify(authors);
}

export function mapVolumeToSearchResult(volume: GoogleBooksVolume): BookSearchResult {
  const info = volume.volumeInfo;

  return {
    id: volume.id,
    title: info.title ?? "Untitled",
    authors: info.authors ?? [],
    coverUrl: info.imageLinks?.thumbnail ? toHttps(info.imageLinks.thumbnail) : null,
    publishedDate: info.publishedDate ?? null,
    pageCount: info.pageCount ?? null,
  };
}

export function mapRowToLibraryEntry(row: { userBook: UserBookRow; book: BookRow }): LibraryEntry {
  const book: Book = {
    id: row.book.id,
    googleBooksId: row.book.googleBooksId,
    title: row.book.title,
    authors: parseAuthors(row.book.authors),
    description: row.book.description,
    thumbnail: row.book.thumbnail,
    publishedDate: row.book.publishedDate,
    pageCount: row.book.pageCount,
    isbn13: row.book.isbn13,
  };

  return {
    userBookId: row.userBook.id,
    status: row.userBook.status,
    category: row.userBook.category,
    rating: row.userBook.rating,
    abandoned: row.userBook.abandoned,
    startedAt: row.userBook.startedAt,
    finishedAt: row.userBook.finishedAt,
    book,
  };
}
