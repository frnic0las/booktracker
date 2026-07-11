import { describe, expect, it } from "vitest";

import { mergeSearchResults } from "./merge";
import type { BookSearchResult, BookSource } from "@/types/books";

function buildResult(
  source: BookSource,
  overrides: Partial<BookSearchResult> = {},
): BookSearchResult {
  return {
    id: source === "openLibrary" ? "OL262758W" : "zyTCAlFPjgYC",
    title: "The Hobbit",
    authors: ["J.R.R. Tolkien"],
    coverUrl: null,
    publishedDate: "1937",
    pageCount: 310,
    isbn13: "9780618968633",
    source,
    ...overrides,
  };
}

describe("mergeSearchResults", () => {
  it("returns OpenLibrary results before Google Books results", () => {
    const merged = mergeSearchResults(
      [buildResult("openLibrary", { isbn13: null })],
      [buildResult("googleBooks", { isbn13: null })],
      [],
    );

    expect(merged.map((result) => result.source)).toEqual(["openLibrary", "googleBooks"]);
  });

  it("drops the Google Books result when its ISBN-13 is covered by OpenLibrary", () => {
    const merged = mergeSearchResults(
      [buildResult("openLibrary")],
      [buildResult("googleBooks")],
      ["9780618968633"],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "OL262758W", source: "openLibrary" });
  });

  it("dedupes against any edition of the work, not just the ISBN-13 the OpenLibrary result displays", () => {
    // An OpenLibrary doc is a work: its `isbn` array lists every edition, and
    // the mapper picks one arbitrarily for display. Google Books returns one
    // specific edition, which is rarely the same one — so the pool, not the
    // displayed value, is what must be matched against.
    const openLibrary = buildResult("openLibrary", { isbn13: "9780792443483" });
    const googleBooks = buildResult("googleBooks", { isbn13: "9780618968633" });

    const merged = mergeSearchResults(
      [openLibrary],
      [googleBooks],
      ["9780792443483", "9780618968633", "9780261102217"],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ source: "openLibrary" });
  });

  it("drops every Google Books edition covered by the same OpenLibrary work", () => {
    const merged = mergeSearchResults(
      [buildResult("openLibrary")],
      [
        buildResult("googleBooks", { id: "gb-1", isbn13: "9780618968633" }),
        buildResult("googleBooks", { id: "gb-2", isbn13: "9780261102217" }),
      ],
      ["9780618968633", "9780261102217"],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ source: "openLibrary" });
  });

  it("keeps a Google Books result whose ISBN-13 is absent from the OpenLibrary pool", () => {
    const merged = mergeSearchResults(
      [buildResult("openLibrary")],
      [buildResult("googleBooks", { isbn13: "9781234567897" })],
      ["9780618968633"],
    );

    expect(merged).toHaveLength(2);
  });

  it("never dedupes a Google Books result without an ISBN-13", () => {
    const merged = mergeSearchResults(
      [buildResult("openLibrary")],
      [
        buildResult("googleBooks", { id: "gb-1", isbn13: null }),
        buildResult("googleBooks", { id: "gb-2", isbn13: null }),
      ],
      ["9780618968633"],
    );

    expect(merged).toHaveLength(3);
  });

  it("ignores ISBN-10 entries in the pool, which can never match an ISBN-13", () => {
    const merged = mergeSearchResults(
      [buildResult("openLibrary")],
      [buildResult("googleBooks", { isbn13: "9781234567897" })],
      ["0618968634", "0261102214"],
    );

    expect(merged).toHaveLength(2);
  });

  it("returns the Google Books results alone when OpenLibrary produced nothing", () => {
    const merged = mergeSearchResults([], [buildResult("googleBooks")], []);

    expect(merged).toEqual([buildResult("googleBooks")]);
  });

  it("returns the OpenLibrary results alone when Google Books produced nothing", () => {
    const merged = mergeSearchResults([buildResult("openLibrary")], [], ["9780618968633"]);

    expect(merged).toEqual([buildResult("openLibrary")]);
  });

  it("returns an empty list when neither catalog produced results", () => {
    expect(mergeSearchResults([], [], [])).toEqual([]);
  });
});
