"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { books, userBooks } from "@/lib/db/schema";
import { serializeAuthors } from "@/lib/books/mappers";
import { GoogleBooksApiError, getBookById, toHttps } from "@/lib/google-books/client";
import { getOpenLibraryDescription } from "@/lib/open-library/client";
import type { BookCategory, BookRating, BookSearchResult, ReadingStatus } from "@/types/books";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// A Server Action is a public endpoint: this payload comes from the client, not
// from the search Route Handler, so every field is re-validated and bounded
// here before it lands in the shared `books` table. coverUrl is restricted to
// the hosts next/image is configured to serve; pageCount is bounded because it
// feeds the sum() in the stats aggregate.
const COVER_HOSTNAME = /^(covers\.openlibrary\.org|books\.google\.com|books\.googleusercontent\.com)$/;

const commonBookFields = {
  title: z.string().min(1).max(512),
  authors: z.array(z.string().max(256)).max(64),
  coverUrl: z.url({ protocol: /^https$/, hostname: COVER_HOSTNAME }).nullable(),
  publishedDate: z.string().max(32).nullable(),
  pageCount: z.number().int().min(1).max(50_000).nullable(),
  isbn13: z.string().regex(/^\d{13}$/).nullable(),
};

const bookSearchResultSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("googleBooks"),
    id: z.string().min(1).max(64),
    ...commonBookFields,
  }),
  z.object({
    source: z.literal("openLibrary"),
    // The id becomes the unique `ol:<id>` cache key, so it must be a real
    // OpenLibrary work id and nothing a client can mint arbitrarily.
    id: z.string().regex(/^OL\d+W$/),
    ...commonBookFields,
  }),
]);

const addBookSchema = z.object({
  result: bookSearchResultSchema,
  category: z.enum(["novel", "non_fiction"]),
  status: z.enum(["want_to_read", "reading", "read"]),
});

/**
 * Builds the `books` row to insert for a search result that is not yet
 * cached. Google Books results are re-fetched to hydrate the description and
 * ISBN-13. OpenLibrary results are hydrated from the already-validated search
 * payload, with only the description fetched separately (OpenLibrary search
 * results carry no description).
 */
async function buildNewBookRow(
  result: BookSearchResult,
  googleBooksId: string,
): Promise<typeof books.$inferSelect> {
  if (result.source === "googleBooks") {
    const volume = await getBookById(result.id);
    const info = volume.volumeInfo;
    const isbn13 =
      info.industryIdentifiers?.find((identifier) => identifier.type === "ISBN_13")?.identifier ??
      null;

    return {
      id: crypto.randomUUID(),
      googleBooksId,
      title: info.title ?? "Untitled",
      authors: serializeAuthors(info.authors ?? []),
      description: info.description ?? null,
      thumbnail: info.imageLinks?.thumbnail ? toHttps(info.imageLinks.thumbnail) : null,
      publishedDate: info.publishedDate ?? null,
      pageCount: info.pageCount ?? null,
      isbn13,
      createdAt: new Date(),
    };
  }

  const description = await getOpenLibraryDescription(result.id);

  return {
    id: crypto.randomUUID(),
    googleBooksId,
    title: result.title,
    authors: serializeAuthors(result.authors),
    description,
    thumbnail: result.coverUrl,
    publishedDate: result.publishedDate,
    pageCount: result.pageCount,
    isbn13: result.isbn13,
    createdAt: new Date(),
  };
}

export async function addBook(
  result: BookSearchResult,
  category: BookCategory,
  status: ReadingStatus,
): Promise<ActionResult<{ userBookId: string }>> {
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = addBookSchema.safeParse({ result, category, status });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    // OpenLibrary IDs are namespaced with an `ol:` prefix so they can never
    // collide with a Google Books volume ID in the unique books.google_books_id column.
    const googleBooksId =
      parsed.data.result.source === "googleBooks"
        ? parsed.data.result.id
        : `ol:${parsed.data.result.id}`;

    let [bookRow] = await db
      .select()
      .from(books)
      .where(eq(books.googleBooksId, googleBooksId))
      .limit(1);

    // The same physical book can be cached under a Google Books id and later
    // matched from OpenLibrary (or vice versa). ISBN-13 is the only stable key
    // shared across sources, so fall back to it before inserting a duplicate.
    if (!bookRow && parsed.data.result.isbn13) {
      [bookRow] = await db
        .select()
        .from(books)
        .where(eq(books.isbn13, parsed.data.result.isbn13))
        .limit(1);
    }

    if (!bookRow) {
      const newBook = await buildNewBookRow(parsed.data.result, googleBooksId);

      await db.insert(books).values(newBook);
      bookRow = newBook;
    }

    const [existingUserBook] = await db
      .select()
      .from(userBooks)
      .where(and(eq(userBooks.userId, userId), eq(userBooks.bookId, bookRow.id)))
      .limit(1);

    if (existingUserBook) {
      return { success: false, error: "Book already in library" };
    }

    const now = new Date();
    const userBookId = crypto.randomUUID();

    await db.insert(userBooks).values({
      id: userBookId,
      userId,
      bookId: bookRow.id,
      status: parsed.data.status,
      category: parsed.data.category,
      startedAt: parsed.data.status === "reading" ? now : null,
      finishedAt: parsed.data.status === "read" ? now : null,
    });

    return { success: true, data: { userBookId } };
  } catch (error) {
    if (error instanceof GoogleBooksApiError) {
      console.error("Failed to fetch book from Google Books:", error);
      return { success: false, error: error.message };
    }

    console.error("Failed to add book:", error);
    return { success: false, error: "Failed to add book" };
  }
}

const updateBookStatusSchema = z.object({
  userBookId: z.string().min(1),
  newStatus: z.enum(["want_to_read", "reading", "read"]),
});

export async function updateBookStatus(
  userBookId: string,
  newStatus: ReadingStatus,
): Promise<ActionResult> {
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateBookStatusSchema.safeParse({ userBookId, newStatus });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const [existing] = await db
      .select()
      .from(userBooks)
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Not found" };
    }

    const now = new Date();
    let startedAt = existing.startedAt;
    let finishedAt = existing.finishedAt;

    if (parsed.data.newStatus === "reading") {
      startedAt = startedAt ?? now;
      finishedAt = null;
    } else if (parsed.data.newStatus === "read") {
      startedAt = startedAt ?? now;
      finishedAt = now;
    } else {
      startedAt = null;
      finishedAt = null;
    }

    const abandoned = parsed.data.newStatus === "read" ? existing.abandoned : false;

    await db
      .update(userBooks)
      .set({ status: parsed.data.newStatus, startedAt, finishedAt, abandoned, updatedAt: now })
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)));

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update book status:", error);
    return { success: false, error: "Failed to update book status" };
  }
}

const updateBookCategorySchema = z.object({
  userBookId: z.string().min(1),
  newCategory: z.enum(["novel", "non_fiction"]),
});

export async function updateBookCategory(
  userBookId: string,
  newCategory: BookCategory,
): Promise<ActionResult> {
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateBookCategorySchema.safeParse({ userBookId, newCategory });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const [existing] = await db
      .select()
      .from(userBooks)
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Not found" };
    }

    await db
      .update(userBooks)
      .set({ category: parsed.data.newCategory, updatedAt: new Date() })
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)));

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update book category:", error);
    return { success: false, error: "Failed to update book category" };
  }
}

const abandonBookSchema = z.object({
  userBookId: z.string().min(1),
});

export async function abandonBook(userBookId: string): Promise<ActionResult> {
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = abandonBookSchema.safeParse({ userBookId });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const [existing] = await db
      .select()
      .from(userBooks)
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Not found" };
    }

    if (existing.status !== "reading") {
      return { success: false, error: "Only a book being read can be abandoned" };
    }

    const now = new Date();

    await db
      .update(userBooks)
      .set({
        status: "read",
        abandoned: true,
        finishedAt: now,
        startedAt: existing.startedAt ?? now,
        updatedAt: now,
      })
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)));

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to abandon book:", error);
    return { success: false, error: "Failed to abandon book" };
  }
}

const updateBookRatingSchema = z.object({
  userBookId: z.string().min(1),
  rating: z.enum(["good", "average", "bad"]).nullable(),
});

export async function updateBookRating(
  userBookId: string,
  rating: BookRating | null,
): Promise<ActionResult> {
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateBookRatingSchema.safeParse({ userBookId, rating });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const [existing] = await db
      .select()
      .from(userBooks)
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Not found" };
    }

    if (existing.status !== "read") {
      return { success: false, error: "Only a finished book can be rated" };
    }

    await db
      .update(userBooks)
      .set({ rating: parsed.data.rating, updatedAt: new Date() })
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)));

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update book rating:", error);
    return { success: false, error: "Failed to update book rating" };
  }
}

const removeBookSchema = z.object({
  userBookId: z.string().min(1),
});

export async function removeBook(userBookId: string): Promise<ActionResult> {
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = removeBookSchema.safeParse({ userBookId });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const [existing] = await db
      .select()
      .from(userBooks)
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Not found" };
    }

    await db
      .delete(userBooks)
      .where(and(eq(userBooks.id, parsed.data.userBookId), eq(userBooks.userId, userId)));

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to remove book:", error);
    return { success: false, error: "Failed to remove book" };
  }
}
