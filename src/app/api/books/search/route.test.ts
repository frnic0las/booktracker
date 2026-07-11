import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireUserId } from "@/lib/auth/session";
import { GoogleBooksApiError, searchBooks } from "@/lib/google-books/client";
import { OpenLibraryApiError, searchOpenLibrary } from "@/lib/open-library/client";
import type {
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

/** Makes OpenLibrary return zero docs, forcing every test onto the Google Books fallback path. */
function stubOpenLibraryEmpty() {
  vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse({ docs: [] }));
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

  describe("OpenLibrary path", () => {
    it("returns OpenLibrary results, tagged with source 'openLibrary', without calling Google Books", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse());

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: Array<{ source: string }> };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "OL262758W", source: "openLibrary" });
      expect(searchBooks).not.toHaveBeenCalled();
    });

    it("calls searchOpenLibrary with no filters when lang and author are absent", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse());

      await GET(buildRequest("?q=the+hobbit"));

      expect(searchOpenLibrary).toHaveBeenCalledWith("the hobbit", {
        langRestrict: undefined,
        author: undefined,
      });
    });

    it("passes lang and author through, trimmed", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue(buildOpenLibraryResponse());

      await GET(buildRequest("?q=the+hobbit&lang=%20en%20&author=%20tolkien%20"));

      expect(searchOpenLibrary).toHaveBeenCalledWith("the hobbit", {
        langRestrict: "en",
        author: "tolkien",
      });
    });
  });

  describe("Google Books fallback", () => {
    it("falls back to Google Books, tagged with source 'googleBooks', when OpenLibrary returns zero docs", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      stubOpenLibraryEmpty();
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: Array<{ source: string }> };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "zyTCAlFPjgYC", source: "googleBooks" });
      expect(searchBooks).toHaveBeenCalledWith("the hobbit", {
        langRestrict: undefined,
        inauthor: undefined,
      });
    });

    it("falls back to Google Books when every OpenLibrary doc is key-less", async () => {
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
      const body = (await response.json()) as { results: Array<{ source: string }> };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "zyTCAlFPjgYC", source: "googleBooks" });
      expect(searchBooks).toHaveBeenCalled();
    });

    it("falls back to Google Books when the OpenLibrary payload is missing 'docs' entirely", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockResolvedValue({
        numFound: 0,
      } as unknown as OpenLibrarySearchResponse);
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: Array<{ source: string }> };
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({ id: "zyTCAlFPjgYC", source: "googleBooks" });
      expect(searchBooks).toHaveBeenCalled();
    });

    it("falls back to Google Books when searchOpenLibrary throws, and logs the failure", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      vi.mocked(searchOpenLibrary).mockRejectedValue(
        new OpenLibraryApiError("Failed to reach OpenLibrary API", 502),
      );
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(200);
      const body = (await response.json()) as { results: Array<{ source: string }> };
      expect(body.results[0]).toMatchObject({ source: "googleBooks" });
      expect(consoleError).toHaveBeenCalled();
    });

    it("passes lang and author through to searchBooks, trimmed, on fallback", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      stubOpenLibraryEmpty();
      vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

      await GET(buildRequest("?q=the+hobbit&lang=%20en%20&author=%20tolkien%20"));

      expect(searchBooks).toHaveBeenCalledWith("the hobbit", {
        langRestrict: "en",
        inauthor: "tolkien",
      });
    });

    it("maps a GoogleBooksApiError to its status after an OpenLibrary fallback", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      stubOpenLibraryEmpty();
      vi.mocked(searchBooks).mockRejectedValue(new GoogleBooksApiError("rate limited", 429));

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({ error: "rate limited" });
    });

    it("maps a 5xx GoogleBooksApiError to 502 after an OpenLibrary fallback", async () => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");
      stubOpenLibraryEmpty();
      vi.mocked(searchBooks).mockRejectedValue(new GoogleBooksApiError("upstream failure", 503));

      const response = await GET(buildRequest("?q=the+hobbit"));

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "upstream failure" });
    });
  });
});
