import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/test/mocks/server";
import type {
  GoogleBooksSearchResponse,
  GoogleBooksVolume,
} from "@/types/books";

import {
  GoogleBooksApiError,
  getBookById,
  normalizeIsbn,
  searchBooks,
  toHttps,
} from "./client";

const GOOGLE_BOOKS_API_BASE = "https://www.googleapis.com/books/v1";

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
        smallThumbnail:
          "http://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=5",
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

describe("google-books client", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_BOOKS_API_KEY", "test-api-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("searchBooks", () => {
    it("returns the parsed search response on success", async () => {
      const expected = buildSearchResponse();

      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("the hobbit");
          expect(url.searchParams.get("key")).toBe("test-api-key");
          return HttpResponse.json(expected);
        }),
      );

      const result = await searchBooks("the hobbit");

      expect(result).toEqual(expected);
    });

    it("URL-encodes the query string", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("tolkien & lewis");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("tolkien & lewis");
    });

    it("throws a GoogleBooksApiError with the response status on a non-ok response", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, () =>
          HttpResponse.json({ error: "rate limited" }, { status: 429 }),
        ),
      );

      await expect(searchBooks("the hobbit")).rejects.toMatchObject({
        name: "GoogleBooksApiError",
        status: 429,
      });
    });

    it("throws a GoogleBooksApiError with status 502 when the request fails to reach the API", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, () => HttpResponse.error()),
      );

      await expect(searchBooks("the hobbit")).rejects.toMatchObject({
        name: "GoogleBooksApiError",
        status: 502,
      });
    });

    it("throws when GOOGLE_BOOKS_API_KEY is missing", async () => {
      vi.stubEnv("GOOGLE_BOOKS_API_KEY", "");

      await expect(searchBooks("the hobbit")).rejects.toThrow(
        "Missing required environment variable: GOOGLE_BOOKS_API_KEY",
      );
    });

    it("appends a quoted inauthor to the q param when options.inauthor is provided", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe('the hobbit inauthor:"tolkien"');
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit", { inauthor: "tolkien" });
    });

    it("quotes a multi-word author so every word binds to inauthor", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe(
            'the hobbit inauthor:"j.r.r. tolkien"',
          );
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit", { inauthor: "j.r.r. tolkien" });
    });

    it("drops double quotes already present in the author value", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe(
            'the hobbit inauthor:"j.r.r. tolkien"',
          );
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit", { inauthor: '"j.r.r. tolkien"' });
    });

    it("omits inauthor when the author value holds nothing but double quotes", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("the hobbit");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit", { inauthor: '""' });
    });

    it("adds langRestrict as its own query param when options.langRestrict is provided", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("the hobbit");
          expect(url.searchParams.get("langRestrict")).toBe("en");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit", { langRestrict: "en" });
    });

    it("sends both langRestrict and inauthor together", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe('the hobbit inauthor:"tolkien"');
          expect(url.searchParams.get("langRestrict")).toBe("en");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit", { langRestrict: "en", inauthor: "tolkien" });
    });

    it("sends neither param when options is omitted", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.has("langRestrict")).toBe(false);
          expect(url.searchParams.get("q")).not.toContain("inauthor:");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit");
    });

    it("sends neither param when options fields are empty strings", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.has("langRestrict")).toBe(false);
          expect(url.searchParams.get("q")).not.toContain("inauthor:");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit", { langRestrict: "", inauthor: "" });
    });

    it("URL-encodes the author value", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe(
            'the hobbit inauthor:"tolkien & lewis"',
          );
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("the hobbit", { inauthor: "tolkien & lewis" });
    });

    it("builds an isbn: query for a bare ISBN-13", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("isbn:9782070368228");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("9782070368228");
    });

    it("strips hyphens from an ISBN-13 before building the isbn: query", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("isbn:9782070368228");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("978-2-07-036822-8");
    });

    it("builds an isbn: query for an ISBN-10 ending in X", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("isbn:080442957X");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("0-8044-2957-x");
    });

    it("falls back to a free-text query when the ISBN checksum is invalid", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("9782070368229");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("9782070368229");
    });

    it("ignores inauthor when the query is an ISBN", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("isbn:9782070368228");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchBooks("9782070368228", { inauthor: "camus" });
    });
  });

  describe("normalizeIsbn", () => {
    it("normalizes an ISBN-13 with and without hyphens", () => {
      expect(normalizeIsbn("9782070368228")).toBe("9782070368228");
      expect(normalizeIsbn("978-2-07-036822-8")).toBe("9782070368228");
      expect(normalizeIsbn("978 2 07 036822 8")).toBe("9782070368228");
    });

    it("normalizes an ISBN-10 with a trailing X", () => {
      expect(normalizeIsbn("080442957X")).toBe("080442957X");
      expect(normalizeIsbn("0-8044-2957-x")).toBe("080442957X");
    });

    it("returns null for an ISBN-13 with an invalid checksum", () => {
      expect(normalizeIsbn("9782070368229")).toBeNull();
    });

    it("returns null for an ISBN-10 with an invalid checksum", () => {
      expect(normalizeIsbn("0804429570")).toBeNull();
    });

    it("returns null for free-text and numeric titles of the wrong length", () => {
      expect(normalizeIsbn("the hobbit")).toBeNull();
      expect(normalizeIsbn("1984")).toBeNull();
      expect(normalizeIsbn("123456789012")).toBeNull();
    });
  });

  describe("getBookById", () => {
    it("returns the parsed volume on success", async () => {
      const expected = buildVolume();

      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes/:volumeId`, ({ params, request }) => {
          expect(params.volumeId).toBe("zyTCAlFPjgYC");
          const url = new URL(request.url);
          expect(url.searchParams.get("key")).toBe("test-api-key");
          return HttpResponse.json(expected);
        }),
      );

      const result = await getBookById("zyTCAlFPjgYC");

      expect(result).toEqual(expected);
    });

    it("throws a GoogleBooksApiError with the response status when the volume is not found", async () => {
      server.use(
        http.get(`${GOOGLE_BOOKS_API_BASE}/volumes/:volumeId`, () =>
          HttpResponse.json({ error: "not found" }, { status: 404 }),
        ),
      );

      await expect(getBookById("does-not-exist")).rejects.toBeInstanceOf(
        GoogleBooksApiError,
      );
      await expect(getBookById("does-not-exist")).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("toHttps", () => {
    it("upgrades an http:// URL to https://", () => {
      expect(
        toHttps(
          "http://books.google.com/books/content?id=zyTCAlFPjgYC&img=1",
        ),
      ).toBe("https://books.google.com/books/content?id=zyTCAlFPjgYC&img=1");
    });

    it("leaves an https:// URL unchanged", () => {
      const url = "https://books.google.com/books/content?id=zyTCAlFPjgYC";
      expect(toHttps(url)).toBe(url);
    });

    it("only replaces a leading http:// occurrence", () => {
      const url = "https://example.com/redirect?to=http://books.google.com";
      expect(toHttps(url)).toBe(url);
    });
  });
});
