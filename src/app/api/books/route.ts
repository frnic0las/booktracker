import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { books, userBooks } from "@/lib/db/schema";
import { mapRowToLibraryEntry } from "@/lib/books/mappers";
import type { LibraryEntry } from "@/types/books";

const querySchema = z.object({
  category: z.enum(["novel", "non_fiction"]).optional(),
  status: z.enum(["want_to_read", "reading", "read"]).optional(),
});

export async function GET(request: NextRequest) {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    category: request.nextUrl.searchParams.get("category") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { category, status } = parsed.data;

  try {
    const conditions = [eq(userBooks.userId, userId)];

    if (category) {
      conditions.push(eq(userBooks.category, category));
    }

    if (status) {
      conditions.push(eq(userBooks.status, status));
    }

    const rows = await db
      .select({ userBook: userBooks, book: books })
      .from(userBooks)
      .innerJoin(books, eq(userBooks.bookId, books.id))
      .where(and(...conditions))
      .orderBy(desc(userBooks.createdAt));

    const entries: LibraryEntry[] = rows.map(mapRowToLibraryEntry);

    return NextResponse.json({ books: entries });
  } catch (error) {
    console.error("Failed to fetch books:", error);
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
  }
}
