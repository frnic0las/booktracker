import "server-only";

import type {
  GoogleBooksSearchResponse,
  GoogleBooksVolume,
} from "@/types/books";

const GOOGLE_BOOKS_API_BASE = "https://www.googleapis.com/books/v1";

export class GoogleBooksApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GoogleBooksApiError";
  }
}

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing required environment variable: GOOGLE_BOOKS_API_KEY");
  }

  return apiKey;
}

/**
 * Ensures Google Books image links use HTTPS (they return HTTP by default).
 */
export function toHttps(url: string): string {
  return url.replace(/^http:\/\//, "https://");
}

export interface SearchBooksOptions {
  langRestrict?: string;
  inauthor?: string;
}

export async function searchBooks(
  query: string,
  options?: SearchBooksOptions,
): Promise<GoogleBooksSearchResponse> {
  const apiKey = getApiKey();
  let q = encodeURIComponent(query);

  if (options?.inauthor) {
    // Google Books has no escape syntax inside a quoted phrase, so double
    // quotes in the value are dropped rather than escaped.
    const author = options.inauthor.replace(/"/g, "").trim();

    if (author) {
      q += `+inauthor:${encodeURIComponent(`"${author}"`)}`;
    }
  }

  let url = `${GOOGLE_BOOKS_API_BASE}/volumes?q=${q}`;

  if (options?.langRestrict) {
    url += `&langRestrict=${encodeURIComponent(options.langRestrict)}`;
  }

  url += `&key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new GoogleBooksApiError(
        "Failed to search Google Books",
        response.status,
      );
    }

    return (await response.json()) as GoogleBooksSearchResponse;
  } catch (error) {
    if (error instanceof GoogleBooksApiError) {
      throw error;
    }
    throw new GoogleBooksApiError("Failed to reach Google Books API", 502);
  }
}

export async function getBookById(volumeId: string): Promise<GoogleBooksVolume> {
  const apiKey = getApiKey();
  const url = `${GOOGLE_BOOKS_API_BASE}/volumes/${encodeURIComponent(volumeId)}?key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new GoogleBooksApiError(
        `Failed to fetch Google Books volume ${volumeId}`,
        response.status,
      );
    }

    return (await response.json()) as GoogleBooksVolume;
  } catch (error) {
    if (error instanceof GoogleBooksApiError) {
      throw error;
    }
    throw new GoogleBooksApiError("Failed to reach Google Books API", 502);
  }
}
