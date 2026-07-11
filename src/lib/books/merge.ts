import type { BookSearchResult } from "@/types/books";

/**
 * Merges the two catalogs into a single result list, OpenLibrary first — the
 * order the UI groups them in. A Google Books result whose ISBN-13 is already
 * covered by OpenLibrary is dropped: the same book from both catalogs is one
 * book.
 *
 * `openLibraryIsbns` must be the *full* ISBN pool of the matched OpenLibrary
 * works, not the single `isbn13` each result displays. An OpenLibrary search
 * doc is a work, and its `isbn` array lists every edition of it (700+ entries
 * for a title like The Hobbit); the mapper picks one arbitrarily for display.
 * Google Books, by contrast, returns one specific edition. Comparing the two
 * display values would therefore almost never match, and the duplicate this
 * function exists to remove would survive.
 *
 * ISBN-13 is the only reliable join key, so a Google Books result without one
 * is never deduplicated — titles collide across editions and translations.
 */
export function mergeSearchResults(
  openLibraryResults: BookSearchResult[],
  googleBooksResults: BookSearchResult[],
  openLibraryIsbns: string[],
): BookSearchResult[] {
  const covered = new Set(openLibraryIsbns);

  const deduped = googleBooksResults.filter(
    (result) => result.isbn13 === null || !covered.has(result.isbn13),
  );

  return [...openLibraryResults, ...deduped];
}
