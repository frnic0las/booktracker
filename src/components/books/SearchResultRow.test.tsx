import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchResultRow } from "./SearchResultRow";
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

describe("SearchResultRow", () => {
  it("renders the title, first author, and year derived from publishedDate", () => {
    render(<SearchResultRow result={buildResult()} onSelect={vi.fn()} />);

    expect(screen.getByText("Dune")).toBeTruthy();
    expect(screen.getByText("Frank Herbert")).toBeTruthy();
    expect(screen.getByText("1965")).toBeTruthy();
  });

  it("renders an img when coverUrl is present", () => {
    const { container } = render(<SearchResultRow result={buildResult()} onSelect={vi.fn()} />);

    expect(container.querySelector("img")).not.toBeNull();
  });

  it("renders the fallback book glyph, not an img, when coverUrl is null", () => {
    const { container } = render(
      <SearchResultRow result={buildResult({ coverUrl: null })} onSelect={vi.fn()} />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("omits the year when publishedDate is null", () => {
    render(<SearchResultRow result={buildResult({ publishedDate: null })} onSelect={vi.fn()} />);

    expect(screen.queryByText("1965")).toBeNull();
  });

  it("calls onSelect when the row is clicked", () => {
    const onSelect = vi.fn();
    render(<SearchResultRow result={buildResult()} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Dune"));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders the GB source badge for a googleBooks result", () => {
    render(<SearchResultRow result={buildResult({ source: "googleBooks" })} onSelect={vi.fn()} />);

    expect(screen.getByText("GB")).toBeTruthy();
  });

  it("renders the OL source badge for an openLibrary result", () => {
    render(<SearchResultRow result={buildResult({ source: "openLibrary" })} onSelect={vi.fn()} />);

    expect(screen.getByText("OL")).toBeTruthy();
  });

  it("renders the source badge on a cover-less result too", () => {
    render(
      <SearchResultRow
        result={buildResult({ coverUrl: null, source: "openLibrary" })}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("OL")).toBeTruthy();
  });

  it("keeps the badge non-interactive (pointer-events-none) so clicks always hit the row button", () => {
    render(<SearchResultRow result={buildResult()} onSelect={vi.fn()} />);

    expect(screen.getByText("GB").className).toContain("pointer-events-none");
  });
});
