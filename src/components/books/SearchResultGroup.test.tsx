import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchResultGroup } from "./SearchResultGroup";
import type { BookSearchResult } from "@/types/books";

function buildResult(overrides: Partial<BookSearchResult> = {}): BookSearchResult {
  return {
    id: "zyTCAlFPjgYC",
    title: "Dune",
    authors: ["Frank Herbert"],
    coverUrl: "https://books.google.com/books/content?id=zyTCAlFPjgYC&img=1",
    publishedDate: "1965-08-01",
    pageCount: 412,
    isbn13: "9780441172719",
    source: "googleBooks",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("SearchResultGroup", () => {
  it("renders the OpenLibrary header with the result count", () => {
    const results = [
      buildResult({ id: "OL1W", title: "Dune", source: "openLibrary" }),
      buildResult({ id: "OL2W", title: "Dune Messiah", source: "openLibrary" }),
    ];

    render(<SearchResultGroup source="openLibrary" results={results} onSelect={vi.fn()} />);

    expect(screen.getByText("OpenLibrary")).toBeTruthy();
    expect(screen.getByText("· 2 results")).toBeTruthy();
  });

  it("renders the Google Books header for the googleBooks source", () => {
    const results = [
      buildResult({ id: "gb1", title: "Dune", source: "googleBooks" }),
      buildResult({ id: "gb2", title: "Children of Dune", source: "googleBooks" }),
      buildResult({ id: "gb3", title: "God Emperor of Dune", source: "googleBooks" }),
    ];

    render(<SearchResultGroup source="googleBooks" results={results} onSelect={vi.fn()} />);

    expect(screen.getByText("Google Books")).toBeTruthy();
    expect(screen.getByText("· 3 results")).toBeTruthy();
  });

  it("uses the singular 'result' when there is exactly one result", () => {
    const results = [buildResult({ id: "9780441172719", title: "Dune", source: "googleBooks" })];

    render(<SearchResultGroup source="googleBooks" results={results} onSelect={vi.fn()} />);

    expect(screen.getByText("· 1 result")).toBeTruthy();
    expect(screen.queryByText("· 1 results")).toBeNull();
  });

  it("renders one row per result", () => {
    const results = [
      buildResult({ id: "OL1W", title: "Dune", source: "openLibrary" }),
      buildResult({ id: "OL2W", title: "Dune Messiah", source: "openLibrary" }),
      buildResult({ id: "OL3W", title: "Children of Dune", source: "openLibrary" }),
    ];

    render(<SearchResultGroup source="openLibrary" results={results} onSelect={vi.fn()} />);

    expect(screen.getByText("Dune")).toBeTruthy();
    expect(screen.getByText("Dune Messiah")).toBeTruthy();
    expect(screen.getByText("Children of Dune")).toBeTruthy();
  });

  it("calls onSelect with the right result when a row is clicked", () => {
    const onSelect = vi.fn();
    const first = buildResult({ id: "OL1W", title: "Dune", source: "openLibrary" });
    const second = buildResult({ id: "OL2W", title: "Dune Messiah", source: "openLibrary" });

    render(<SearchResultGroup source="openLibrary" results={[first, second]} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Dune Messiah"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(second);
  });
});
