import { describe, expect, it } from "vitest";

import type { books, userBooks } from "@/lib/db/schema";
import type { GoogleBooksVolume } from "@/types/books";

import {
  mapRowToLibraryEntry,
  mapVolumeToSearchResult,
  parseAuthors,
  serializeAuthors,
} from "./mappers";

type BookRow = typeof books.$inferSelect;
type UserBookRow = typeof userBooks.$inferSelect;

function buildVolume(overrides: Partial<GoogleBooksVolume> = {}): GoogleBooksVolume {
  return {
    id: "zyTCAlFPjgYC",
    volumeInfo: {
      title: "The Hobbit",
      authors: ["J.R.R. Tolkien"],
      description: "A hobbit goes on an unexpected journey.",
      publishedDate: "1937-09-21",
      pageCount: 310,
      imageLinks: {
        smallThumbnail:
          "http://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=5",
        thumbnail:
          "http://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1",
      },
      industryIdentifiers: [
        { type: "ISBN_13", identifier: "9780618968633" },
        { type: "ISBN_10", identifier: "0618968634" },
      ],
    },
    ...overrides,
  };
}

function buildBookRow(overrides: Partial<BookRow> = {}): BookRow {
  return {
    id: "book-1",
    googleBooksId: "zyTCAlFPjgYC",
    title: "The Hobbit",
    authors: '["J.R.R. Tolkien"]',
    description: "A hobbit goes on an unexpected journey.",
    thumbnail: "https://books.google.com/books/content?id=zyTCAlFPjgYC&img=1",
    publishedDate: "1937-09-21",
    pageCount: 310,
    isbn13: "9780618968633",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildUserBookRow(overrides: Partial<UserBookRow> = {}): UserBookRow {
  return {
    id: "user-book-1",
    userId: "user-1",
    bookId: "book-1",
    status: "reading",
    category: "novel",
    rating: null,
    notes: null,
    startedAt: new Date("2024-02-01T00:00:00.000Z"),
    finishedAt: null,
    createdAt: new Date("2024-02-01T00:00:00.000Z"),
    updatedAt: new Date("2024-02-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("books mappers", () => {
  describe("parseAuthors", () => {
    it("returns an empty array for null", () => {
      expect(parseAuthors(null)).toEqual([]);
    });

    it("parses a JSON array string", () => {
      expect(parseAuthors('["A","B"]')).toEqual(["A", "B"]);
    });

    it("returns an empty array for malformed JSON", () => {
      expect(parseAuthors("not json")).toEqual([]);
    });

    it("returns an empty array for a JSON string that is not an array", () => {
      expect(parseAuthors('"x"')).toEqual([]);
    });

    it("returns an empty array for a JSON object", () => {
      expect(parseAuthors("{}")).toEqual([]);
    });

    it("filters out non-string elements", () => {
      expect(parseAuthors('["A",1,null,"B"]')).toEqual(["A", "B"]);
    });
  });

  describe("serializeAuthors", () => {
    it("round-trips with parseAuthors", () => {
      const authors = ["J.R.R. Tolkien", "Christopher Tolkien"];
      expect(parseAuthors(serializeAuthors(authors))).toEqual(authors);
    });

    it("serializes an empty array to '[]'", () => {
      expect(serializeAuthors([])).toBe("[]");
    });
  });

  describe("mapVolumeToSearchResult", () => {
    it("maps a full volume to a search result", () => {
      const volume = buildVolume();

      expect(mapVolumeToSearchResult(volume)).toEqual({
        id: "zyTCAlFPjgYC",
        title: "The Hobbit",
        authors: ["J.R.R. Tolkien"],
        coverUrl: "https://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1",
        publishedDate: "1937-09-21",
        pageCount: 310,
      });
    });

    it("falls back to defaults when volumeInfo is empty", () => {
      const volume = buildVolume({ volumeInfo: {} });

      expect(mapVolumeToSearchResult(volume)).toEqual({
        id: "zyTCAlFPjgYC",
        title: "Untitled",
        authors: [],
        coverUrl: null,
        publishedDate: null,
        pageCount: null,
      });
    });
  });

  describe("mapRowToLibraryEntry", () => {
    it("maps a userBook/book row to a LibraryEntry", () => {
      const userBook = buildUserBookRow();
      const book = buildBookRow();

      expect(mapRowToLibraryEntry({ userBook, book })).toEqual({
        userBookId: "user-book-1",
        status: "reading",
        category: "novel",
        rating: null,
        startedAt: new Date("2024-02-01T00:00:00.000Z"),
        finishedAt: null,
        book: {
          id: "book-1",
          googleBooksId: "zyTCAlFPjgYC",
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          description: "A hobbit goes on an unexpected journey.",
          thumbnail: "https://books.google.com/books/content?id=zyTCAlFPjgYC&img=1",
          publishedDate: "1937-09-21",
          pageCount: 310,
          isbn13: "9780618968633",
        },
      });
    });

    it("parses a null authors column to an empty array", () => {
      const userBook = buildUserBookRow();
      const book = buildBookRow({ authors: null });

      expect(mapRowToLibraryEntry({ userBook, book }).book.authors).toEqual([]);
    });
  });
});
