import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { books, userBooks } from "@/lib/db/schema";
import { mapRowToLibraryEntry } from "@/lib/books/mappers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [row] = await db
      .select({ userBook: userBooks, book: books })
      .from(userBooks)
      .innerJoin(books, eq(userBooks.bookId, books.id))
      .where(and(eq(userBooks.id, id), eq(userBooks.userId, userId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(mapRowToLibraryEntry(row));
  } catch (error) {
    console.error("Failed to fetch book:", error);
    return NextResponse.json({ error: "Failed to fetch book" }, { status: 500 });
  }
}
