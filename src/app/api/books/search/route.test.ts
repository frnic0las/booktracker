import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireUserId } from "@/lib/auth/session";
import { GoogleBooksApiError, searchBooks } from "@/lib/google-books/client";
import type { GoogleBooksSearchResponse, GoogleBooksVolume } from "@/types/books";

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
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it("returns 400 when q is missing", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user-1");

    const response = await GET(buildRequest(""));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Missing required query parameter: q",
    });
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it("returns 400 when q is blank", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user-1");

    const response = await GET(buildRequest("?q=%20%20"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Missing required query parameter: q",
    });
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it("calls searchBooks with no filters when lang and author are absent", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

    const response = await GET(buildRequest("?q=the+hobbit"));

    expect(response.status).toBe(200);
    expect(searchBooks).toHaveBeenCalledWith("the hobbit", {
      langRestrict: undefined,
      inauthor: undefined,
    });
  });

  it("passes lang and author through, trimmed", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(searchBooks).mockResolvedValue(buildSearchResponse());

    const response = await GET(
      buildRequest("?q=the+hobbit&lang=%20en%20&author=%20tolkien%20"),
    );

    expect(response.status).toBe(200);
    expect(searchBooks).toHaveBeenCalledWith("the hobbit", {
      langRestrict: "en",
      inauthor: "tolkien",
    });
  });

  it.each(["eng", "FR", "f"])(
    "returns 400 without calling searchBooks when lang is invalid (%s)",
    async (lang) => {
      vi.mocked(requireUserId).mockResolvedValue("user-1");

      const response = await GET(buildRequest(`?q=the+hobbit&lang=${lang}`));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid query parameter: lang" });
      expect(searchBooks).not.toHaveBeenCalled();
    },
  );

  it("maps a GoogleBooksApiError to its status", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(searchBooks).mockRejectedValue(
      new GoogleBooksApiError("rate limited", 429),
    );

    const response = await GET(buildRequest("?q=the+hobbit"));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate limited" });
  });

  it("maps a 5xx GoogleBooksApiError to 502", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user-1");
    vi.mocked(searchBooks).mockRejectedValue(
      new GoogleBooksApiError("upstream failure", 503),
    );

    const response = await GET(buildRequest("?q=the+hobbit"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream failure" });
  });
});
