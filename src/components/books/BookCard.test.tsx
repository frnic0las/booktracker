import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BookCard, type BookCardProps } from "./BookCard";

function buildProps(overrides: Partial<BookCardProps> = {}): BookCardProps {
  return {
    id: "book-1",
    title: "The Hobbit",
    authors: ["J.R.R. Tolkien"],
    thumbnail: "https://books.google.com/books/content?id=zyTCAlFPjgYC&img=1",
    rating: null,
    abandoned: false,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("BookCard", () => {
  it("renders an image cover when a thumbnail is provided", () => {
    const props = buildProps();
    const { container } = render(<BookCard {...props} />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain(
      encodeURIComponent(props.thumbnail as string),
    );
  });

  it("wraps the card in a link to /books/:id", () => {
    const { container } = render(<BookCard {...buildProps({ id: "book-42" })} />);

    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/books/book-42");
  });

  it("renders a fallback tile with the title and no image when there is no thumbnail", () => {
    const { container } = render(<BookCard {...buildProps({ thumbnail: null })} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getAllByText("The Hobbit").length).toBeGreaterThan(0);
  });

  it("renders the first author when authors are present", () => {
    render(<BookCard {...buildProps({ authors: ["J.R.R. Tolkien", "Christopher Tolkien"] })} />);

    expect(screen.getByText("J.R.R. Tolkien")).toBeTruthy();
  });

  it("omits the author line when authors is empty", () => {
    render(<BookCard {...buildProps({ authors: [] })} />);

    expect(screen.queryByText("J.R.R. Tolkien")).toBeNull();
  });

  it("renders the rating chip when a rating is set", () => {
    render(<BookCard {...buildProps({ rating: "good" })} />);

    expect(screen.getByText("👍")).toBeTruthy();
    expect(screen.getByText("Rated good")).toBeTruthy();
  });

  it("renders no rating chip when rating is null", () => {
    render(<BookCard {...buildProps({ rating: null })} />);

    expect(screen.queryByText("👍")).toBeNull();
    expect(screen.queryByText(/^Rated/)).toBeNull();
  });

  it("renders the DNF strip when the book is abandoned", () => {
    render(<BookCard {...buildProps({ abandoned: true })} />);

    expect(screen.getByText("DNF")).toBeTruthy();
    expect(screen.getByText("Did not finish")).toBeTruthy();
  });

  it("renders no DNF strip when the book is not abandoned", () => {
    render(<BookCard {...buildProps({ abandoned: false })} />);

    expect(screen.queryByText("DNF")).toBeNull();
    expect(screen.queryByText("Did not finish")).toBeNull();
  });
});
