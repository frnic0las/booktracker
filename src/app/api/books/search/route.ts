import { NextRequest, NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth/session";
import { GoogleBooksApiError, searchBooks } from "@/lib/google-books/client";
import { searchOpenLibrary } from "@/lib/open-library/client";
import { mapOpenLibraryDocToSearchResult, mapVolumeToSearchResult } from "@/lib/books/mappers";
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
    const openLibraryResponse = await searchOpenLibrary(q, { langRestrict: lang, author });
    // Map first, then gate on the mapped count: a payload with docs that are
    // all key-less (or a malformed body missing `docs`) must fall through to
    // Google Books, not return an empty "no matches" result.
    const results: BookSearchResult[] = (openLibraryResponse.docs ?? [])
      .filter((doc) => doc.key)
      .map(mapOpenLibraryDocToSearchResult);

    if (results.length > 0) {
      return NextResponse.json({ results });
    }
  } catch (error) {
    // OpenLibrary is unreliable enough that its own outage must not break
    // search — fall through to the Google Books path below.
    console.error("Failed to search OpenLibrary, falling back to Google Books:", error);
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
