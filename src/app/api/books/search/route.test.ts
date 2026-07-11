import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireUserId } from "@/lib/auth/session";
import { GoogleBooksApiError, searchBooks } from "@/lib/google-books/client";
import { OpenLibraryApiError, searchOpenLibrary } from "@/lib/open-library/client";
import type {
  BookSearchResult,
  GoogleBooksSearchResponse,
  GoogleBooksVolume,
  OpenLibraryDoc,
  OpenLibrarySearchResponse,
} from "@/types/books";

import { GET } from "./route";

vi.mock("@/lib/auth/session", () => ({
  requireUserId: vi.fn(),
}));

vi.mock("@/lib/google-books/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/google-books/client")>();
  return {
    ...actual,
    searchBooks: vi.fn(),
  };
});

vi.mock("@/lib/open-library/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/open-library/client")>();
  return {
    ...actual,
    searchOpenLibrary: vi.fn(),
  };
});

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

function buildSearchResponse(
  overrides: Partial<GoogleBooksSearchResponse> = {},
): GoogleBooksSearchResponse {
  return {
    totalItems: 1,
    items: [buildVolume()],
    ...overrides,
  };
}

function buildOpenLibraryDoc(overrides: Partial<OpenLibraryDoc> = {}): OpenLibraryDoc {
  return {
    key: "/works/OL262758W",
    title: "The Hobbit",
    author_name: ["J.R.R. Tolkien"],
    first_publish_year: 1937,
    number_of_pages_median: 310,
    cover_i: 6979861,
    ...overrides,
  };
}

function buildOpenLibraryResponse(
  overrides: Partial<OpenLibrarySearchResponse> = {},
): OpenLibrarySearchResponse {
  return {
    numFound: 1,
    docs: [buildOpenLibraryDoc()],
    ...overrides,
  };
}

function buildRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/books/search${query}`);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/books/search", () => {
  it("returns 401 when there is no session", async () => {
    vi.mocked(requireUserId).mockResolvedValue(null);

    const response = await GET(buildRequest("?q=the+hobbit"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(searchOpenLibrary).not.toHaveBeenCalled();
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it("returns 400 when q is missing", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user-1");

    const response = await GET(buildRequest(""));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Missing required query parameter: q",
    });
    expect(searchOpenLibrary).not.toHaveBeenCalled();
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it("returns 400 when q is blank", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user-1");

    const response = await GET(buildRequest("?q=%20%20"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Missing required query parameter: q",
    });
    expect(searchOpenLibrary).not.toHaveBeenCalled();
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it.each(["eng", "FR", "f"])(
    "returns 400 without calling either search client when lang is invalid (%s)",
    async (lang) => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const response = await GET(buildRequest(`?q=the+hobbit&lang=${lang}`));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid query parameter: lang" });
      expect(searchOpenLibrary).not.toHaveBeenCalled();
      expect(searchBooks).not.toHaveBeenCalled();
    },
  );

  describe("merged results", () => {
    it("merges results from both sources, OpenLibrary first, with an empty failedSources", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse());
      vi.mocked(searchBooks).mockResolvedValue(
        buildSearchResponse({
          items: [
            buildVolume({
              id: "gb-unique",
              volumeInfo: {
                title: "Another Book",
                industryIdentifiers: [{ type: "ISBN_13", identifier: "1111111111111" }],
              },
            }),
          ],
        }),
      );

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[]; failedSources: string[] };
      expect(body.results).toHaveLength(2);
      expect(body.results[0]).toMatchObject({ id: "OL262758W", source: "openLibrary" });
      expect(body.results[1]).toMatchObject({ id: "gb-unique", source: "googleBooks" });
      expect(body.failedSources).toEqual([]);
    });

    it("always calls both clients, even when OpenLibrary already returned results", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse());
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      await GET(buildRequest("?q=the+hobbit"));

      expect(searchOpenLibrary).toHaveBeenCalledTimes(1);
      expect(searchBooks).toHaveBeenCalledTimes(1);
    });

    it("deduplicates on ISBN-13, dropping the Google Books duplicate and keeping the OpenLibrary one", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(
        buildOpenLibraryResponse({
          docs: [buildOpenLibraryDoc({ isbn: ["9780618968633"] })],
        }),
      );
      // Default buildVolume() also carries isbn13 9780618968633.
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[] };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "OL262758W", source: "openLibrary" });
    });

    it("never dedupes a Google Books result with a null isbn13", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(
        buildOpenLibraryResponse({
          docs: [buildOpenLibraryDoc({ isbn: ["9780618968633"] })],
        }),
      );
      vi.mocked(searchBooks).mockResolvedValue(
        buildSearchResponse({
          items: [
            buildVolume({
              id: "gb-no-isbn",
              volumeInfo: { title: "Untitled Edition" },
            }),
          ],
        }),
      );

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[] };
      expect(body.results).toHaveLength(2);
      expect(body.results.map((result) => result.id)).toEqual(["OL262758W", "gb-no-isbn"]);
    });

    it("deduplicates against the full multi-edition ISBN pool, not just the displayed isbn13", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      // The mapper displays the first 13-digit ISBN ("9780792443483"), but the
      // work's full pool also covers the edition Google Books returns.
      vi.mocked(searchOpenLibrary).mockResolvedValue(
        buildOpenLibraryResponse({
          docs: [
            buildOpenLibraryDoc({
              isbn: ["9780792443483", "9780618968633", "0261102214"],
            }),
          ],
        }),
      );
      // Default buildVolume() carries isbn13 9780618968633, which only appears
      // deep in the OpenLibrary pool, not in the displayed isbn13.
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[] };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "OL262758W", source: "openLibrary" });
    });

    it("filters out key-less OpenLibrary docs before merging", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(
        buildOpenLibraryResponse({
          docs: [
            buildOpenLibraryDoc({ key: "" }),
            buildOpenLibraryDoc({ key: undefined as unknown as string }),
          ],
        }),
      );
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[] };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "zyTCAlFPjgYC", source: "googleBooks" });
    });

    it("passes lang and author through, trimmed, to both clients", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse());
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      await GET(buildRequest("?q=the+hobbit&lang=%20en%20&author=%20tolkien%20"));

      expect(searchOpenLibrary).toHaveBeenCalledWith("the hobbit", {
        langRestrict: "en",
        author: "tolkien",
      });
      expect(searchBooks).toHaveBeenCalledWith("the hobbit", {
        langRestrict: "en",
        inauthor: "tolkien",
      });
    });

    it("calls searchOpenLibrary with undefined langRestrict and author when neither filter is set", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse());
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      await GET(buildRequest("?q=the+hobbit"));

      expect(searchOpenLibrary).toHaveBeenCalledWith("the hobbit", {
        langRestrict: undefined,
        author: undefined,
      });
    });

    it("tolerates an OpenLibrary payload missing docs entirely, returning Google Books results", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue({ numFound: 0 } as OpenLibrarySearchResponse);
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[]; failedSources: string[] };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "zyTCAlFPjgYC", source: "googleBooks" });
      expect(body.failedSources).toEqual([]);
    });

    it("returns 200 with empty results when both catalogs fulfil with zero results", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse({ docs: [] }));
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse({ items: [] }));

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[]; failedSources: string[] };
      expect(body.results).toEqual([]);
      expect(body.failedSources).toEqual([]);
    });
  });

  describe("partial failures", () => {
    it("returns Google Books results with failedSources: ['openLibrary'] and 200 when OpenLibrary rejects", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockRejectedValue(
        new OpenLibraryApiError("Failed to reach OpenLibrary API", 502),
      );
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[]; failedSources: string[] };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "zyTCAlFPjgYC", source: "googleBooks" });
      expect(body.failedSources).toEqual(["openLibrary"]);
      expect(consoleError).toHaveBeenCalled();
    });

    it("returns OpenLibrary results with failedSources: ['googleBooks'] and 200 when Google Books rejects", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse());
      vi.mocked(searchBooks).mockRejectedValue(new GoogleBooksApiError("rate limited", 429));
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[]; failedSources: string[] };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "OL262758W", source: "openLibrary" });
      expect(body.failedSources).toEqual(["googleBooks"]);
      expect(consoleError).toHaveBeenCalled();
    });

    it("returns 200 with empty results when Google Books rejects and OpenLibrary returns zero docs", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse({ docs: [] }));
      vi.mocked(searchBooks).mockRejectedValue(new GoogleBooksApiError("rate limited", 429));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[]; failedSources: string[] };
      expect(body.results).toEqual([]);
      expect(body.failedSources).toEqual(["googleBooks"]);
    });

    it("returns 200 with empty results when OpenLibrary rejects and Google Books returns zero items", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockRejectedValue(
        new OpenLibraryApiError("Failed to reach OpenLibrary API", 502),
      );
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse({ items: [] }));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: BookSearchResult[]; failedSources: string[] };
      expect(body.results).toEqual([]);
      expect(body.failedSources).toEqual(["openLibrary"]);
    });
  });

  describe("total failure", () => {
    it("surfaces a GoogleBooksApiError status when both sources reject (429 passthrough)", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockRejectedValue(
        new OpenLibraryApiError("Failed to reach OpenLibrary API", 502),
      );
      vi.mocked(searchBooks).mockRejectedValue(new GoogleBooksApiError("rate limited", 429));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ error: "rate limited" });
    });

    it("maps a 5xx GoogleBooksApiError to 502 when both sources reject", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockRejectedValue(
        new OpenLibraryApiError("Failed to reach OpenLibrary API", 502),
      );
      vi.mocked(searchBooks).mockRejectedValue(new GoogleBooksApiError("upstream failure", 503));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "upstream failure" });
    });

    it("returns 500 when both sources reject with a generic (non-GoogleBooksApiError) error", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockRejectedValue(
        new OpenLibraryApiError("Failed to reach OpenLibrary API", 502),
      );
      vi.mocked(searchBooks).mockRejectedValue(new Error("network error"));
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Failed to search books" });
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
