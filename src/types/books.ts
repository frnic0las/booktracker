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

export type BookCategory = "novel" | "non_fiction";

export interface UserBook {
  id: string;
  userId: string;
  bookId: string;
  status: ReadingStatus;
  category: BookCategory;
  rating: number | null;
  notes: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface BookSearchResult {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publishedDate: string | null;
  pageCount: number | null;
}

export interface LibraryEntry {
  userBookId: string;
  status: ReadingStatus;
  category: BookCategory;
  rating: number | null;
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
