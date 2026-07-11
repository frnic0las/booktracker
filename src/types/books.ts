// Domain model used throughout the app.
export interface Book {
  id: string;
  googleBooksId: string;
  title: string;
  authors: string[];
  description: string | null;
  thumbnail: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  isbn13: string | null;
}

export type ReadingStatus = "want_to_read" | "reading" | "read";

export type BookRating = "good" | "average" | "bad";

export type BookCategory = "novel" | "non_fiction";

export interface UserBook {
  id: string;
  userId: string;
  bookId: string;
  status: ReadingStatus;
  category: BookCategory;
  rating: BookRating | null;
  abandoned: boolean;
  notes: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export type BookSource = "openLibrary" | "googleBooks";

export interface BookSearchResult {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  isbn13: string | null;
  source: BookSource;
}

export interface BookSearchResponse {
  results: BookSearchResult[];
  failedSources: BookSource[];
}

export interface LibraryEntry {
  userBookId: string;
  status: ReadingStatus;
  category: BookCategory;
  rating: BookRating | null;
  abandoned: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  book: Book;
}

export interface CategoryStats {
  reading: number;
  read: number;
  want_to_read: number;
}

export interface BookStats {
  total: number;
  novels: CategoryStats;
  non_fiction: CategoryStats;
  totalPagesRead: number;
}

// --- Google Books API v1 response shapes ---
// https://developers.google.com/books/docs/v1/reference/volumes

export interface GoogleBooksImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
}

export interface GoogleBooksIndustryIdentifier {
  type: string;
  identifier: string;
}

export interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  imageLinks?: GoogleBooksImageLinks;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
}

export interface GoogleBooksVolume {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

export interface GoogleBooksSearchResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

// --- OpenLibrary API response shapes ---
// https://openlibrary.org/dev/docs/api/search

export interface OpenLibraryDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  isbn?: string[];
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  docs: OpenLibraryDoc[];
}

export interface OpenLibraryWork {
  description?: string | { type: string; value: string };
}
