import { NextRequest, NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth/session";
import { GoogleBooksApiError, searchBooks } from "@/lib/google-books/client";
import { searchOpenLibrary } from "@/lib/open-library/client";
import { mapOpenLibraryDocToSearchResult, mapVolumeToSearchResult } from "@/lib/books/mappers";
import { mergeSearchResults } from "@/lib/books/merge";
import type { BookSearchResponse, BookSearchResult, BookSource } from "@/types/books";

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

  const [openLibrarySettled, googleBooksSettled] = await Promise.allSettled([
    searchOpenLibrary(q, { langRestrict: lang, author }),
    searchBooks(q, { langRestrict: lang, inauthor: author }),
  ]);

  const failedSources: BookSource[] = [];

  if (openLibrarySettled.status === "rejected") {
    console.error("Failed to search OpenLibrary:", openLibrarySettled.reason);
    failedSources.push("openLibrary");
  }

  if (googleBooksSettled.status === "rejected") {
    console.error("Failed to search books:", googleBooksSettled.reason);
    failedSources.push("googleBooks");
  }

  if (openLibrarySettled.status === "rejected" && googleBooksSettled.status === "rejected") {
    const googleBooksError: unknown = googleBooksSettled.reason;

    if (googleBooksError instanceof GoogleBooksApiError) {
      return NextResponse.json(
        { error: googleBooksError.message },
        { status: googleBooksError.status >= 500 ? 502 : googleBooksError.status },
      );
    }

    return NextResponse.json({ error: "Failed to search books" }, { status: 500 });
  }

  // A key-less doc cannot be mapped to a result, but its ISBNs still identify
  // the work, so the dedup pool is collected before that filter.
  const openLibraryDocs =
    openLibrarySettled.status === "fulfilled" ? (openLibrarySettled.value.docs ?? []) : [];

  const openLibraryResults: BookSearchResult[] = openLibraryDocs
    .filter((doc) => doc.key)
    .map(mapOpenLibraryDocToSearchResult);

  const openLibraryIsbns = openLibraryDocs.flatMap((doc) => doc.isbn ?? []);

  const googleBooksResults: BookSearchResult[] =
    googleBooksSettled.status === "fulfilled"
      ? (googleBooksSettled.value.items ?? []).slice(0, 20).map(mapVolumeToSearchResult)
      : [];

  const body: BookSearchResponse = {
    results: mergeSearchResults(openLibraryResults, googleBooksResults, openLibraryIsbns),
    failedSources,
  };

  return NextResponse.json(body);
}
