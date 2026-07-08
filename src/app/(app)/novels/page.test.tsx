import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Book, LibraryEntry } from "@/types/books";

import NovelsPage from "./page";

function buildBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    googleBooksId: "zyTCAlFPjgYC",
    title: "The Hobbit",
    authors: ["J.R.R. Tolkien"],
    description: "A hobbit goes on an unexpected journey.",
    thumbnail: null,
    publishedDate: "1937-09-21",
    pageCount: 310,
    isbn13: "9780618968633",
    ...overrides,
  };
}

function buildEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    userBookId: "user-book-1",
    status: "reading",
    category: "novel",
    rating: null,
    startedAt: null,
    finishedAt: null,
    book: buildBook(),
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("NovelsPage", () => {
  it("loads the 'reading' status by default and renders the returned books", async () => {
    const entries = [
      buildEntry({ userBookId: "user-book-1", book: buildBook({ id: "book-1", title: "The Hobbit" }) }),
    ];
    fetchMock.mockResolvedValueOnce(jsonResponse({ books: entries }));

    render(<NovelsPage />);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestedUrl).toContain("category=novel");
    expect(requestedUrl).toContain("status=reading");

    const titles = await screen.findAllByText("The Hobbit");
    expect(titles.length).toBeGreaterThan(0);
  });

  it("shows the empty state when no books are returned", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ books: [] }));

    render(<NovelsPage />);

    expect(await screen.findByText("Nothing here yet")).toBeTruthy();
  });

  it("shows the retry affordance when the request fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false));

    render(<NovelsPage />);

    expect(await screen.findByText("Retry")).toBeTruthy();
    expect(screen.getByText("Couldn't load your books. Pull to retry.")).toBeTruthy();
  });

  it("refetches with the new status when a sub-tab is clicked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ books: [] }));

    render(<NovelsPage />);

    await screen.findByText("Nothing here yet");

    fetchMock.mockResolvedValueOnce(jsonResponse({ books: [] }));
    fireEvent.click(screen.getByText("Read"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondUrl = fetchMock.mock.calls[1][0] as string;
    expect(secondUrl).toContain("category=novel");
    expect(secondUrl).toContain("status=read");
  });

  it("links the header add button to /search?from=novels", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ books: [] }));

    render(<NovelsPage />);

    await screen.findByText("Nothing here yet");

    expect(screen.getByLabelText("Add book").getAttribute("href")).toBe(
      "/search?from=novels",
    );
  });
});
