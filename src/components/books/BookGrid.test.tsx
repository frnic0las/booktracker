import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BookGrid } from "./BookGrid";
import type { Book, LibraryEntry } from "@/types/books";

function buildBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    googleBooksId: "zyTCAlFPjgYC",
    title: "The Hobbit",
    authors: ["J.R.R. Tolkien"],
    description: "A hobbit goes on an unexpected journey.",
    thumbnail: "https://books.google.com/books/content?id=zyTCAlFPjgYC&img=1",
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

afterEach(() => {
  cleanup();
});

describe("BookGrid", () => {
  it("renders the empty state when there are no entries", () => {
    const { container } = render(
      <BookGrid
        entries={[]}
        emptyTitle="Nothing here yet"
        emptyDescription="Search and add your first one."
        addHref="/search?from=novels"
      />,
    );

    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText("Search and add your first one.")).toBeTruthy();

    const addLink = screen.getByText("+ Add a book");
    expect(addLink.closest("a")?.getAttribute("href")).toBe("/search?from=novels");

    const hrefs = Array.from(container.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs.some((href) => href?.startsWith("/books/"))).toBe(false);
  });

  it("renders a card per entry when entries are present", () => {
    const entries = [
      buildEntry({
        userBookId: "user-book-1",
        book: buildBook({ id: "book-1", title: "The Hobbit" }),
      }),
      buildEntry({
        userBookId: "user-book-2",
        book: buildBook({
          id: "book-2",
          title: "The Fellowship of the Ring",
          googleBooksId: "abc123",
          isbn13: "9780618346257",
        }),
      }),
    ];

    const { container } = render(
      <BookGrid
        entries={entries}
        emptyTitle="Nothing here yet"
        emptyDescription="Search and add your first one."
        addHref="/search?from=novels"
      />,
    );

    expect(screen.getByText("The Hobbit")).toBeTruthy();
    expect(screen.getByText("The Fellowship of the Ring")).toBeTruthy();
    expect(screen.queryByText("Nothing here yet")).toBeNull();

    const links = container.querySelectorAll("a");
    const hrefs = Array.from(links).map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/books/user-book-1");
    expect(hrefs).toContain("/books/user-book-2");
  });
});
