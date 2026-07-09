"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { books, userBooks } from "@/lib/db/schema";
import { serializeAuthors } from "@/lib/books/mappers";
import { GoogleBooksApiError, getBookById, toHttps } from "@/lib/google-books/client";
import type { BookCategory, BookRating, ReadingStatus } from "@/types/books";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const addBookSchema = z.object({
  googleBooksId: z.string().min(1),
  category: z.enum(["novel", "non_fiction"]),
  status: z.enum(["want_to_read", "reading", "read"]),
});

export async function addBook(
  googleBooksId: string,
  category: BookCategory,
  status: ReadingStatus,
): Promise<ActionResult<{ userBookId: string }>> {
  const userId = await requireUserId();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = addBookSchema.safeParse({ googleBooksId, category, status });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    let [bookRow] = await db
      .select()
      .from(books)
      .where(eq(books.googleBooksId, parsed.data.googleBooksId))
      .limit(1);

    if (!bookRow) {
      const volume = await getBookById(parsed.data.googleBooksId);
      const info = volume.volumeInfo;
      const isbn13 =
        info.industryIdentifiers?.find((identifier) => identifier.type === "ISBN_13")
          ?.identifier ?? null;

      const newBook = {
        id: crypto.randomUUID(),
        googleBooksId: volume.id,
        title: info.title ?? "Untitled",
        authors: serializeAuthors(info.authors ?? []),
        description: info.description ?? null,
        thumbnail: info.imageLinks?.thumbnail ? toHttps(info.imageLinks.thumbnail) : null,
        publishedDate: info.publishedDate ?? null,
        pageCount: info.pageCount ?? null,
        isbn13,
        createdAt: new Date(),
      };

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

    const abandoned = parsed.data.newStatus === "read" ? existing.abandoned : 0;

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
        abandoned: 1,
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
  rating: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
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
