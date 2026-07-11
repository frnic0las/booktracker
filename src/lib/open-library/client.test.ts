import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/mocks/server";
import type { OpenLibrarySearchResponse, OpenLibraryWork } from "@/types/books";

import {
  OpenLibraryApiError,
  getOpenLibraryDescription,
  openLibraryCoverUrl,
  searchOpenLibrary,
} from "./client";

const OPEN_LIBRARY_BASE = "https://openlibrary.org";

function buildSearchResponse(
  overrides: Partial<OpenLibrarySearchResponse> = {},
): OpenLibrarySearchResponse {
  return {
    numFound: 1,
    docs: [
      {
        key: "/works/OL262758W",
        title: "The Hobbit",
        author_name: ["J.R.R. Tolkien"],
        first_publish_year: 1937,
        number_of_pages_median: 310,
        cover_i: 6979861,
      },
    ],
    ...overrides,
  };
}

describe("open-library client", () => {
  describe("searchOpenLibrary", () => {
    it("builds an isbn: query for a bare ISBN-13 and omits the author param", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("isbn:9782070368228");
          expect(url.searchParams.has("author")).toBe(false);
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchOpenLibrary("9782070368228", { author: "camus" });
    });

    it("strips hyphens from an ISBN-13 before building the isbn: query", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("isbn:9782070368228");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchOpenLibrary("978-2-07-036822-8");
    });

    it("requests the isbn field alongside the existing fields", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, ({ request }) => {
          const url = new URL(request.url);
          const fields = url.searchParams.get("fields");
          expect(fields).toContain("isbn");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchOpenLibrary("the hobbit");
    });

    it("sends a free-text q param when the query is not an ISBN", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("the hobbit");
          expect(url.searchParams.has("author")).toBe(false);
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchOpenLibrary("the hobbit");
    });

    it("adds an author param for a free-text query when options.author is provided", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("q")).toBe("the hobbit");
          expect(url.searchParams.get("author")).toBe("tolkien");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchOpenLibrary("the hobbit", { author: "tolkien" });
    });

    it("maps langRestrict 'fr' to the MARC language code 'fre'", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("language")).toBe("fre");
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      await searchOpenLibrary("the hobbit", { langRestrict: "fr" });
    });

    it("short-circuits with an empty result, making no network request, when langRestrict has no MARC mapping", async () => {
      let requestReceived = false;
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, () => {
          requestReceived = true;
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      const result = await searchOpenLibrary("the hobbit", { langRestrict: "xx" });

      expect(result).toEqual({ numFound: 0, docs: [] });
      expect(requestReceived).toBe(false);
    });

    it("short-circuits without a network request for an unmapped 2-letter lang code that isn't 'xx' (e.g. Swedish)", async () => {
      let requestReceived = false;
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, () => {
          requestReceived = true;
          return HttpResponse.json(buildSearchResponse());
        }),
      );

      const result = await searchOpenLibrary("the hobbit", { langRestrict: "sv" });

      expect(result).toEqual({ numFound: 0, docs: [] });
      expect(requestReceived).toBe(false);
    });

    it("returns the parsed search response on success", async () => {
      const expected = buildSearchResponse();

      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, () => HttpResponse.json(expected)),
      );

      const result = await searchOpenLibrary("the hobbit");

      expect(result).toEqual(expected);
    });

    it("throws an OpenLibraryApiError with the response status on a non-ok response", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, () =>
          HttpResponse.json({ error: "rate limited" }, { status: 429 }),
        ),
      );

      await expect(searchOpenLibrary("the hobbit")).rejects.toMatchObject({
        name: "OpenLibraryApiError",
        status: 429,
      });
      await expect(searchOpenLibrary("the hobbit")).rejects.toBeInstanceOf(
        OpenLibraryApiError,
      );
    });

    it("throws an OpenLibraryApiError with status 502 when the request fails to reach the API", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/search.json`, () => HttpResponse.error()),
      );

      await expect(searchOpenLibrary("the hobbit")).rejects.toMatchObject({
        name: "OpenLibraryApiError",
        status: 502,
      });
    });
  });

  describe("getOpenLibraryDescription", () => {
    it("returns a plain string description", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/works/:workId.json`, ({ params }) => {
          expect(params.workId).toBe("OL262758W");
          const work: OpenLibraryWork = { description: "A hobbit goes on an unexpected journey." };
          return HttpResponse.json(work);
        }),
      );

      const result = await getOpenLibraryDescription("OL262758W");

      expect(result).toBe("A hobbit goes on an unexpected journey.");
    });

    it("unwraps a { type, value } description object", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/works/:workId.json`, () => {
          const work: OpenLibraryWork = {
            description: { type: "/type/text", value: "A hobbit goes on an unexpected journey." },
          };
          return HttpResponse.json(work);
        }),
      );

      const result = await getOpenLibraryDescription("OL262758W");

      expect(result).toBe("A hobbit goes on an unexpected journey.");
    });

    it("returns null when the description field is absent", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/works/:workId.json`, () =>
          HttpResponse.json({} satisfies OpenLibraryWork),
        ),
      );

      const result = await getOpenLibraryDescription("OL262758W");

      expect(result).toBeNull();
    });

    it("returns null (never throws) on a non-ok response", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/works/:workId.json`, () =>
          HttpResponse.json({ error: "not found" }, { status: 404 }),
        ),
      );

      const result = await getOpenLibraryDescription("does-not-exist");

      expect(result).toBeNull();
    });

    it("returns null (never throws) when the request fails to reach the API", async () => {
      server.use(
        http.get(`${OPEN_LIBRARY_BASE}/works/:workId.json`, () => HttpResponse.error()),
      );

      const result = await getOpenLibraryDescription("OL262758W");

      expect(result).toBeNull();
    });
  });

  describe("openLibraryCoverUrl", () => {
    it("builds a covers.openlibrary.org medium-size URL from a cover id", () => {
      expect(openLibraryCoverUrl(6979861)).toBe(
        "https://covers.openlibrary.org/b/id/6979861-M.jpg",
      );
    });
  });
});
