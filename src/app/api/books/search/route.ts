import { NextRequest, NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth/session";
import { GoogleBooksApiError, searchBooks } from "@/lib/google-books/client";
import { mapVolumeToSearchResult } from "@/lib/books/mappers";
import type { BookSearchResult } from "@/types/books";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing required query parameter: q" }, { status: 400 });
  }

  const lang = request.nextUrl.searchParams.get("lang")?.trim() || undefined;
  const author = request.nextUrl.searchParams.get("author")?.trim() || undefined;

  if (lang && !/^[a-z]{2}$/.test(lang)) {
    return NextResponse.json({ error: "Invalid query parameter: lang" }, { status: 400 });
  }

  try {
    const res = await searchBooks(q, { langRestrict: lang, inauthor: author });
    const results: BookSearchResult[] = (res.items ?? [])
      .slice(0, 20)
      .map(mapVolumeToSearchResult);

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof GoogleBooksApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status >= 500 ? 502 : error.status },
      );
    }

    console.error("Failed to search books:", error);
    return NextResponse.json({ error: "Failed to search books" }, { status: 500 });
  }
}
