import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { books, userBooks } from "@/lib/db/schema";
import { GoogleBooksApiError, getBookById } from "@/lib/google-books/client";
import { getOpenLibraryDescription } from "@/lib/open-library/client";
import type { BookSearchResult, GoogleBooksVolume } from "@/types/books";

import {
  abandonBook,
  addBook,
  removeBook,
  updateBookCategory,
  updateBookRating,
  updateBookStatus,
} from "./books";

vi.mock("@/lib/auth/session", () => ({
  requireUserId: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/google-books/client", () => ({
  getBookById: vi.fn(),
  toHttps: (url: string) => url.replace(/^http:\/\//, "https://"),
  GoogleBooksApiError: class GoogleBooksApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      this.name = "GoogleBooksApiError";
    }
  },
}));

vi.mock("@/lib/open-library/client", () => ({
  getOpenLibraryDescription: vi.fn(),
}));

type BookRow = typeof books.$inferSelect;
type UserBookRow = typeof userBooks.$inferSelect;

interface SelectChain {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
}

interface MockedDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const mockedDb = db as unknown as MockedDb;

function selectChain(result: unknown[]): SelectChain {
  const chain = {} as SelectChain;
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve(result));
  return chain;
}

/** Queues one `db.select()` chain per call, resolved in call order. */
function queueSelect(...results: unknown[][]): SelectChain[] {
  return results.map((result) => {
    const chain = selectChain(result);
    mockedDb.select.mockReturnValueOnce(chain);
    return chain;
  });
}

function mockInsert() {
  const values = vi.fn().mockResolvedValue(undefined);
  mockedDb.insert.mockReturnValue({ values });
  return values;
}

function mockUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn((values: Record<string, unknown>) => ({ where, values }));
  mockedDb.update.mockReturnValue({ set });
  return { set, where };
}

function mockDelete() {
  const where = vi.fn().mockResolvedValue(undefined);
  mockedDb.delete.mockReturnValue({ where });
  return where;
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
    status: "want_to_read",
    category: "novel",
    rating: null,
    abandoned: false,
    notes: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildSearchResult(overrides: Partial<BookSearchResult> = {}): BookSearchResult {
  return {
    id: "zyTCAlFPjgYC",
    title: "The Hobbit",
    authors: ["J.R.R. Tolkien"],
    coverUrl: "https://books.google.com/books/content?id=zyTCAlFPjgYC&img=1",
    publishedDate: "1937-09-21",
    pageCount: 310,
    isbn13: null,
    source: "googleBooks",
    ...overrides,
  };
}

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

beforeEach(() => {
  vi.resetAllMocks();
});

describe("actions/books", () => {
  describe("addBook", () => {
    const googleBooksId = "zyTCAlFPjgYC";

    it("returns Unauthorized when there is no session", async () => {
      vi.mocked(requireUserId).mockResolvedValue(null);

      const result = await addBook(buildSearchResult(), "novel", "want_to_read");

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns a validation error for an empty id", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const result = await addBook(buildSearchResult({ id: "" }), "novel", "want_to_read");

      expect(result.success).toBe(false);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns 'Book already in library' when a userBooks row already exists for this user and book", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const bookRow = buildBookRow();
      const existingUserBook = buildUserBookRow({ userId: "user-1", bookId: bookRow.id });
      queueSelect([bookRow], [existingUserBook]);

      const result = await addBook(buildSearchResult(), "novel", "want_to_read");

      expect(result).toEqual({ success: false, error: "Book already in library" });
      expect(getBookById).not.toHaveBeenCalled();
      expect(mockedDb.insert).not.toHaveBeenCalled();
    });

    it("fetches, caches, and adds a new book to the library when it is not already cached", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      queueSelect([], []);
      vi.mocked(getBookById).mockResolvedValue(buildVolume());
      const insertValues = mockInsert();
      vi.spyOn(crypto, "randomUUID")
        .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
        .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");

      const result = await addBook(buildSearchResult(), "novel", "reading");

      expect(getBookById).toHaveBeenCalledWith(googleBooksId);
      expect(mockedDb.insert).toHaveBeenNthCalledWith(1, books);
      expect(insertValues).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: "11111111-1111-1111-1111-111111111111",
          googleBooksId,
          title: "The Hobbit",
          authors: '["J.R.R. Tolkien"]',
          thumbnail:
            "https://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1",
          publishedDate: "1937-09-21",
          pageCount: 310,
          isbn13: "9780618968633",
        }),
      );

      expect(mockedDb.insert).toHaveBeenNthCalledWith(2, userBooks);
      expect(insertValues).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: "22222222-2222-2222-2222-222222222222",
          userId: "user-1",
          bookId: "11111111-1111-1111-1111-111111111111",
          status: "reading",
          category: "novel",
          startedAt: expect.any(Date),
          finishedAt: null,
        }),
      );

      expect(result).toEqual({
        success: true,
        data: { userBookId: "22222222-2222-2222-2222-222222222222" },
      });
    });

    it("returns the Google Books error message when the API call fails", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      queueSelect([]);
      vi.mocked(getBookById).mockRejectedValue(
        new GoogleBooksApiError("Failed to fetch Google Books volume zyTCAlFPjgYC", 404),
      );

      const result = await addBook(buildSearchResult(), "novel", "want_to_read");

      expect(result).toEqual({
        success: false,
        error: "Failed to fetch Google Books volume zyTCAlFPjgYC",
      });
      expect(mockedDb.insert).not.toHaveBeenCalled();
    });

    it("returns a validation error for a non-https coverUrl", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const result = await addBook(
        buildSearchResult({ coverUrl: "http://covers.openlibrary.org/b/id/6979861-M.jpg" }),
        "novel",
        "want_to_read",
      );

      expect(result.success).toBe(false);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns a validation error for a coverUrl host not on the allowlist", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const result = await addBook(
        buildSearchResult({ coverUrl: "https://evil.example.com/cover.jpg" }),
        "novel",
        "want_to_read",
      );

      expect(result.success).toBe(false);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns a validation error for a pageCount below 1", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const result = await addBook(
        buildSearchResult({ pageCount: -1 }),
        "novel",
        "want_to_read",
      );

      expect(result.success).toBe(false);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns a validation error for a pageCount above the 50,000 cap", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const result = await addBook(
        buildSearchResult({ pageCount: 999_999 }),
        "novel",
        "want_to_read",
      );

      expect(result.success).toBe(false);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns a validation error for an isbn13 that is not 13 digits", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const result = await addBook(
        buildSearchResult({ isbn13: "12345" }),
        "novel",
        "want_to_read",
      );

      expect(result.success).toBe(false);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns a validation error for an OpenLibrary id that is not a valid OL...W work id", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const result = await addBook(
        buildSearchResult({
          source: "openLibrary",
          id: "garbage",
          coverUrl: "https://covers.openlibrary.org/b/id/6979861-M.jpg",
        }),
        "novel",
        "want_to_read",
      );

      expect(result.success).toBe(false);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    describe("OpenLibrary source", () => {
      const openLibraryResult = buildSearchResult({
        id: "OL262758W",
        title: "The Hobbit",
        authors: ["J.R.R. Tolkien"],
        coverUrl: "https://covers.openlibrary.org/b/id/6979861-M.jpg",
        publishedDate: "1937",
        pageCount: 310,
        isbn13: null,
        source: "openLibrary",
      });

      it("hydrates from the payload, prefixes google_books_id with 'ol:', stores isbn13 null, and never calls getBookById", async () => {
        vi.mocked(requireUserId).mockResolvedValue("user-1");
        queueSelect([], []);
        vi.mocked(getOpenLibraryDescription).mockResolvedValue(
          "A hobbit goes on an unexpected journey.",
        );
        const insertValues = mockInsert();
        vi.spyOn(crypto, "randomUUID")
          .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
          .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");

        const result = await addBook(openLibraryResult, "novel", "want_to_read");

        expect(getOpenLibraryDescription).toHaveBeenCalledWith("OL262758W");
        expect(getBookById).not.toHaveBeenCalled();
        expect(mockedDb.insert).toHaveBeenNthCalledWith(1, books);
        expect(insertValues).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            id: "11111111-1111-1111-1111-111111111111",
            googleBooksId: "ol:OL262758W",
            title: "The Hobbit",
            authors: '["J.R.R. Tolkien"]',
            description: "A hobbit goes on an unexpected journey.",
            thumbnail: "https://covers.openlibrary.org/b/id/6979861-M.jpg",
            publishedDate: "1937",
            pageCount: 310,
            isbn13: null,
          }),
        );

        expect(result).toEqual({
          success: true,
          data: { userBookId: "22222222-2222-2222-2222-222222222222" },
        });
      });

      it("stores a null description when getOpenLibraryDescription resolves null", async () => {
        vi.mocked(requireUserId).mockResolvedValue("user-1");
        queueSelect([], []);
        vi.mocked(getOpenLibraryDescription).mockResolvedValue(null);
        const insertValues = mockInsert();
        vi.spyOn(crypto, "randomUUID")
          .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
          .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");

        await addBook(openLibraryResult, "novel", "want_to_read");

        expect(insertValues).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ description: null }),
        );
      });

      it("looks up an existing book by its 'ol:' prefixed id and does not re-insert it", async () => {
        vi.mocked(requireUserId).mockResolvedValue("user-1");
        const bookRow = buildBookRow({ id: "book-1", googleBooksId: "ol:OL262758W", isbn13: null });
        queueSelect([bookRow], []);
        mockInsert();

        await addBook(openLibraryResult, "novel", "want_to_read");

        expect(getOpenLibraryDescription).not.toHaveBeenCalled();
        expect(mockedDb.insert).toHaveBeenCalledTimes(1);
        expect(mockedDb.insert).not.toHaveBeenCalledWith(books);
      });

      it("persists the result's isbn13 onto the inserted books row when no cached row is matched", async () => {
        vi.mocked(requireUserId).mockResolvedValue("user-1");
        // No row matches the 'ol:' prefixed google_books_id, and none matches
        // the isbn13 either, so a fresh row is inserted with isbn13 carried
        // straight through from the search result.
        queueSelect([], [], []);
        vi.mocked(getOpenLibraryDescription).mockResolvedValue(
          "A hobbit goes on an unexpected journey.",
        );
        const insertValues = mockInsert();
        vi.spyOn(crypto, "randomUUID")
          .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
          .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");

        await addBook(
          { ...openLibraryResult, isbn13: "9780618968633" },
          "novel",
          "want_to_read",
        );

        expect(insertValues).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({ isbn13: "9780618968633" }),
        );
      });

      it("reuses an existing books row matched by isbn13 instead of inserting a duplicate when the same book is added from OpenLibrary after Google Books", async () => {
        vi.mocked(requireUserId).mockResolvedValue("user-1");
        // Cached under a bare Google Books id from a prior Google Books add.
        const bookRow = buildBookRow({
          id: "book-1",
          googleBooksId: "zyTCAlFPjgYC",
          isbn13: "9780618968633",
        });
        const existingUserBook = buildUserBookRow({ userId: "user-1", bookId: bookRow.id });
        // 1st select: by 'ol:OL262758W' -> miss. 2nd select: by isbn13 -> hit
        // the Google-sourced row. 3rd select: userBooks lookup -> already there.
        queueSelect([], [bookRow], [existingUserBook]);

        const result = await addBook(
          { ...openLibraryResult, isbn13: "9780618968633" },
          "novel",
          "want_to_read",
        );

        expect(result).toEqual({ success: false, error: "Book already in library" });
        expect(getOpenLibraryDescription).not.toHaveBeenCalled();
        expect(mockedDb.insert).not.toHaveBeenCalled();
      });
    });
  });

  describe("updateBookStatus", () => {
    it("returns Unauthorized when there is no session", async () => {
      vi.mocked(requireUserId).mockResolvedValue(null);

      const result = await updateBookStatus("user-book-1", "reading");

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns Not found when no userBooks row matches this id for this user", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      queueSelect([]);

      const result = await updateBookStatus("user-book-1", "reading");

      expect(result).toEqual({ success: false, error: "Not found" });
      expect(mockedDb.update).not.toHaveBeenCalled();
    });

    it("scopes both the lookup and the update to the current user_id", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow();
      const [chain] = queueSelect([existing]);
      const { where: updateWhere } = mockUpdate();

      await updateBookStatus(existing.id, "reading");

      const expectedFilter = and(
        eq(userBooks.id, existing.id),
        eq(userBooks.userId, "user-1"),
      );
      expect(chain.where).toHaveBeenCalledWith(expectedFilter);
      expect(updateWhere).toHaveBeenCalledWith(expectedFilter);
    });

    it("sets startedAt and clears finishedAt on the first transition to 'reading'", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({
        status: "want_to_read",
        startedAt: null,
        finishedAt: null,
      });
      queueSelect([existing]);
      const { set } = mockUpdate();

      const result = await updateBookStatus(existing.id, "reading");

      const setArg = set.mock.calls[0][0];
      expect(setArg.status).toBe("reading");
      expect(setArg.startedAt).toBeInstanceOf(Date);
      expect(setArg.finishedAt).toBeNull();
      expect(result).toEqual({ success: true, data: undefined });
    });

    it("preserves the existing startedAt and sets finishedAt on transition to 'read'", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const startedAt = new Date("2024-02-01T00:00:00.000Z");
      const existing = buildUserBookRow({ status: "reading", startedAt, finishedAt: null });
      queueSelect([existing]);
      const { set } = mockUpdate();

      await updateBookStatus(existing.id, "read");

      const setArg = set.mock.calls[0][0];
      expect(setArg.status).toBe("read");
      expect(setArg.startedAt).toBe(startedAt);
      expect(setArg.finishedAt).toBeInstanceOf(Date);
    });

    it("clears startedAt and finishedAt when moving back to 'want_to_read'", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({
        status: "read",
        startedAt: new Date("2024-02-01T00:00:00.000Z"),
        finishedAt: new Date("2024-03-01T00:00:00.000Z"),
      });
      queueSelect([existing]);
      const { set } = mockUpdate();

      await updateBookStatus(existing.id, "want_to_read");

      const setArg = set.mock.calls[0][0];
      expect(setArg.status).toBe("want_to_read");
      expect(setArg.startedAt).toBeNull();
      expect(setArg.finishedAt).toBeNull();
    });

    it("clears the abandoned flag when moving an abandoned 'read' book back to 'reading'", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({
        status: "read",
        abandoned: true,
        startedAt: new Date("2024-02-01T00:00:00.000Z"),
        finishedAt: new Date("2024-03-01T00:00:00.000Z"),
      });
      queueSelect([existing]);
      const { set } = mockUpdate();

      await updateBookStatus(existing.id, "reading");

      const setArg = set.mock.calls[0][0];
      expect(setArg.abandoned).toBe(false);
    });

    it("preserves abandoned when moving to 'read'", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({
        status: "reading",
        abandoned: true,
        startedAt: new Date("2024-02-01T00:00:00.000Z"),
        finishedAt: null,
      });
      queueSelect([existing]);
      const { set } = mockUpdate();

      await updateBookStatus(existing.id, "read");

      const setArg = set.mock.calls[0][0];
      expect(setArg.abandoned).toBe(true);
    });
  });

  describe("updateBookCategory", () => {
    it("returns Unauthorized when there is no session", async () => {
      vi.mocked(requireUserId).mockResolvedValue(null);

      const result = await updateBookCategory("user-book-1", "non_fiction");

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns Not found when no userBooks row matches this id for this user", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      queueSelect([]);

      const result = await updateBookCategory("user-book-1", "non_fiction");

      expect(result).toEqual({ success: false, error: "Not found" });
      expect(mockedDb.update).not.toHaveBeenCalled();
    });

    it("updates the category, scoped to user_id, on the happy path", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({ category: "novel" });
      const [chain] = queueSelect([existing]);
      const { set, where: updateWhere } = mockUpdate();

      const result = await updateBookCategory(existing.id, "non_fiction");

      const expectedFilter = and(
        eq(userBooks.id, existing.id),
        eq(userBooks.userId, "user-1"),
      );
      expect(chain.where).toHaveBeenCalledWith(expectedFilter);
      expect(set).toHaveBeenCalledWith(expect.objectContaining({ category: "non_fiction" }));
      expect(updateWhere).toHaveBeenCalledWith(expectedFilter);
      expect(result).toEqual({ success: true, data: undefined });
    });
  });

  describe("abandonBook", () => {
    it("returns Unauthorized when there is no session", async () => {
      vi.mocked(requireUserId).mockResolvedValue(null);

      const result = await abandonBook("user-book-1");

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns Not found when no userBooks row matches this id for this user", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      queueSelect([]);

      const result = await abandonBook("user-book-1");

      expect(result).toEqual({ success: false, error: "Not found" });
      expect(mockedDb.update).not.toHaveBeenCalled();
    });

    it("rejects abandoning a book with status 'want_to_read'", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({ status: "want_to_read" });
      queueSelect([existing]);

      const result = await abandonBook(existing.id);

      expect(result).toEqual({
        success: false,
        error: "Only a book being read can be abandoned",
      });
      expect(mockedDb.update).not.toHaveBeenCalled();
    });

    it("rejects abandoning a book with status 'read'", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({ status: "read" });
      queueSelect([existing]);

      const result = await abandonBook(existing.id);

      expect(result).toEqual({
        success: false,
        error: "Only a book being read can be abandoned",
      });
      expect(mockedDb.update).not.toHaveBeenCalled();
    });

    it("marks a 'reading' book as read and abandoned, preserving startedAt", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const startedAt = new Date("2024-02-01T00:00:00.000Z");
      const existing = buildUserBookRow({
        status: "reading",
        startedAt,
        finishedAt: null,
      });
      const [chain] = queueSelect([existing]);
      const { set, where: updateWhere } = mockUpdate();

      const result = await abandonBook(existing.id);

      const expectedFilter = and(
        eq(userBooks.id, existing.id),
        eq(userBooks.userId, "user-1"),
      );
      expect(chain.where).toHaveBeenCalledWith(expectedFilter);

      const setArg = set.mock.calls[0][0];
      expect(setArg.status).toBe("read");
      expect(setArg.abandoned).toBe(true);
      expect(setArg.finishedAt).toBeInstanceOf(Date);
      expect(setArg.startedAt).toBe(startedAt);
      expect(updateWhere).toHaveBeenCalledWith(expectedFilter);
      expect(result).toEqual({ success: true, data: undefined });
    });
  });

  describe("updateBookRating", () => {
    it("returns Unauthorized when there is no session", async () => {
      vi.mocked(requireUserId).mockResolvedValue(null);

      const result = await updateBookRating("user-book-1", "average");

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns Not found when no userBooks row matches this id for this user", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      queueSelect([]);

      const result = await updateBookRating("user-book-1", "average");

      expect(result).toEqual({ success: false, error: "Not found" });
      expect(mockedDb.update).not.toHaveBeenCalled();
    });

    it("rejects rating a book with status 'reading'", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({ status: "reading" });
      queueSelect([existing]);

      const result = await updateBookRating(existing.id, "average");

      expect(result).toEqual({
        success: false,
        error: "Only a finished book can be rated",
      });
      expect(mockedDb.update).not.toHaveBeenCalled();
    });

    it("sets the rating, scoped to user_id, on a 'read' book", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({ status: "read", rating: null });
      const [chain] = queueSelect([existing]);
      const { set, where: updateWhere } = mockUpdate();

      const result = await updateBookRating(existing.id, "average");

      const expectedFilter = and(
        eq(userBooks.id, existing.id),
        eq(userBooks.userId, "user-1"),
      );
      expect(chain.where).toHaveBeenCalledWith(expectedFilter);
      expect(set).toHaveBeenCalledWith(expect.objectContaining({ rating: "average" }));
      expect(updateWhere).toHaveBeenCalledWith(expectedFilter);
      expect(result).toEqual({ success: true, data: undefined });
    });

    it("clears the rating with null on a 'read' book", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow({ status: "read", rating: "good" });
      queueSelect([existing]);
      const { set } = mockUpdate();

      const result = await updateBookRating(existing.id, null);

      expect(set).toHaveBeenCalledWith(expect.objectContaining({ rating: null }));
      expect(result).toEqual({ success: true, data: undefined });
    });
  });

  describe("removeBook", () => {
    it("returns Unauthorized when there is no session", async () => {
      vi.mocked(requireUserId).mockResolvedValue(null);

      const result = await removeBook("user-book-1");

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns Not found when no userBooks row matches this id for this user", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      queueSelect([]);

      const result = await removeBook("user-book-1");

      expect(result).toEqual({ success: false, error: "Not found" });
      expect(mockedDb.delete).not.toHaveBeenCalled();
    });

    it("removes the userBooks row, scoped to user_id, on the happy path", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const existing = buildUserBookRow();
      queueSelect([existing]);
      const deleteWhere = mockDelete();

      const result = await removeBook(existing.id);

      expect(deleteWhere).toHaveBeenCalledWith(
        and(eq(userBooks.id, existing.id), eq(userBooks.userId, "user-1")),
      );
      expect(result).toEqual({ success: true, data: undefined });
    });
  });
});
