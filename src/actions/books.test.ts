import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { books, userBooks } from "@/lib/db/schema";
import { GoogleBooksApiError, getBookById } from "@/lib/google-books/client";
import type { GoogleBooksVolume } from "@/types/books";

import { addBook, removeBook, updateBookCategory, updateBookStatus } from "./books";

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
    notes: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
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

      const result = await addBook(googleBooksId, "novel", "want_to_read");

      expect(result).toEqual({ success: false, error: "Unauthorized" });
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns a validation error for an empty googleBooksId", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const result = await addBook("", "novel", "want_to_read");

      expect(result.success).toBe(false);
      expect(mockedDb.select).not.toHaveBeenCalled();
    });

    it("returns 'Book already in library' when a userBooks row already exists for this user and book", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      const bookRow = buildBookRow();
      const existingUserBook = buildUserBookRow({ userId: "user-1", bookId: bookRow.id });
      queueSelect([bookRow], [existingUserBook]);

      const result = await addBook(googleBooksId, "novel", "want_to_read");

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

      const result = await addBook(googleBooksId, "novel", "reading");

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

      const result = await addBook(googleBooksId, "novel", "want_to_read");

      expect(result).toEqual({
        success: false,
        error: "Failed to fetch Google Books volume zyTCAlFPjgYC",
      });
      expect(mockedDb.insert).not.toHaveBeenCalled();
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
