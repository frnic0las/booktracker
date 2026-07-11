import "server-only";

import { normalizeIsbn } from "@/lib/books/isbn";
import type { OpenLibrarySearchResponse, OpenLibraryWork } from "@/types/books";

const OPEN_LIBRARY_BASE = "https://openlibrary.org";

export class OpenLibraryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OpenLibraryApiError";
  }
}

// OpenLibrary's `language` search param expects 3-letter MARC codes, not the
// 2-letter ISO 639-1 codes the UI offers. Only the codes below are honoured;
// any other lang code is omitted, so OpenLibrary results are then unfiltered
// by language (the Google Books fallback still honours langRestrict as-is).
const ISO_639_1_TO_MARC: Record<string, string> = {
  en: "eng",
  fr: "fre",
  es: "spa",
  de: "ger",
  it: "ita",
  pt: "por",
  nl: "dut",
  ru: "rus",
  ja: "jpn",
  zh: "chi",
};

export interface SearchOpenLibraryOptions {
  langRestrict?: string;
  author?: string;
}

export async function searchOpenLibrary(
  query: string,
  options?: SearchOpenLibraryOptions,
): Promise<OpenLibrarySearchResponse> {
  const isbn = normalizeIsbn(query);
  // An unmapped language code is left off the request entirely, so OpenLibrary
  // returns results unfiltered by language rather than short-circuiting.
  const marc = options?.langRestrict ? ISO_639_1_TO_MARC[options.langRestrict] : undefined;

  const fields = "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn";
  let url = `${OPEN_LIBRARY_BASE}/search.json?fields=${encodeURIComponent(fields)}&limit=20`;

  if (isbn) {
    // Mirrors the Google Books client: a scanned/entered ISBN resolves to a
    // single edition via the isbn: field operator, so author does not apply.
    url += `&q=${encodeURIComponent(`isbn:${isbn}`)}`;
  } else {
    url += `&q=${encodeURIComponent(query)}`;

    if (options?.author) {
      url += `&author=${encodeURIComponent(options.author)}`;
    }
  }

  if (marc) {
    url += `&language=${encodeURIComponent(marc)}`;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new OpenLibraryApiError("Failed to search OpenLibrary", response.status);
    }

    return (await response.json()) as OpenLibrarySearchResponse;
  } catch (error) {
    if (error instanceof OpenLibraryApiError) {
      throw error;
    }
    throw new OpenLibraryApiError("Failed to reach OpenLibrary API", 502);
  }
}

export async function getOpenLibraryDescription(workId: string): Promise<string | null> {
  // Enrichment only, not a hard dependency: any failure (network error or
  // non-ok response) degrades to a null description rather than throwing.
  try {
    const response = await fetch(`${OPEN_LIBRARY_BASE}/works/${encodeURIComponent(workId)}.json`);

    if (!response.ok) {
      return null;
    }

    const work = (await response.json()) as OpenLibraryWork;

    if (!work.description) {
      return null;
    }

    return typeof work.description === "string" ? work.description : work.description.value;
  } catch {
    return null;
  }
}

export function openLibraryCoverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}
