import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddBookSheet, type AddBookSheetProps } from "./AddBookSheet";
import { addBook } from "@/actions/books";
import type { BookSearchResult } from "@/types/books";

vi.mock("@/actions/books", () => ({
  addBook: vi.fn(),
}));

const mockedAddBook = vi.mocked(addBook);

function buildResult(overrides: Partial<BookSearchResult> = {}): BookSearchResult {
  return {
    id: "zyTCAlFPjgYC",
    title: "Dune",
    authors: ["Frank Herbert"],
    coverUrl: "https://books.google.com/books/content?id=zyTCAlFPjgYC&img=1",
    publishedDate: "1965-08-01",
    pageCount: 412,
    ...overrides,
  };
}

function buildProps(overrides: Partial<AddBookSheetProps> = {}): AddBookSheetProps {
  return {
    result: buildResult(),
    initialCategory: "novel",
    open: true,
    onClose: vi.fn(),
    onKeepSearching: vi.fn(),
    onDone: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("AddBookSheet", () => {
  it("renders nothing when closed", () => {
    render(<AddBookSheet {...buildProps({ open: false })} />);

    expect(screen.queryByText("Dune")).toBeNull();
    expect(screen.queryByText("Add to library")).toBeNull();
  });

  it("renders the book title, subtitle, and pre-selected category and status", () => {
    render(<AddBookSheet {...buildProps()} />);

    expect(screen.getByText("Dune")).toBeTruthy();
    expect(screen.getByText("Frank Herbert · 1965")).toBeTruthy();

    expect(screen.getByText("Novel").closest("button")?.getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByText("Non-Fiction").closest("button")?.getAttribute("aria-pressed")).toBe(
      "false",
    );

    expect(screen.getByText("Reading").closest("button")?.getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByText("Read").closest("button")?.getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("calls addBook with the pre-selected category and status when confirmed without changes", async () => {
    mockedAddBook.mockResolvedValue({ success: true, data: { userBookId: "ub-1" } });
    render(<AddBookSheet {...buildProps()} />);

    fireEvent.click(screen.getByText("Add to library"));

    await waitFor(() => {
      expect(mockedAddBook).toHaveBeenCalledWith("zyTCAlFPjgYC", "novel", "reading");
    });
  });

  it("calls addBook with the updated category and status after changing the selection", async () => {
    mockedAddBook.mockResolvedValue({ success: true, data: { userBookId: "ub-1" } });
    render(<AddBookSheet {...buildProps()} />);

    fireEvent.click(screen.getByText("Non-Fiction"));
    fireEvent.click(screen.getByText("Read"));
    fireEvent.click(screen.getByText("Add to library"));

    await waitFor(() => {
      expect(mockedAddBook).toHaveBeenCalledWith("zyTCAlFPjgYC", "non_fiction", "read");
    });
  });

  it("shows the duplicate error and does not render the success view", async () => {
    mockedAddBook.mockResolvedValue({ success: false, error: "Book already in library" });
    render(<AddBookSheet {...buildProps()} />);

    fireEvent.click(screen.getByText("Add to library"));

    expect(await screen.findByText("Book already in library")).toBeTruthy();
    expect(screen.queryByText("Added to library")).toBeNull();
  });

  it("shows the success view and wires Keep searching / Done actions", async () => {
    mockedAddBook.mockResolvedValue({ success: true, data: { userBookId: "ub-1" } });
    const onKeepSearching = vi.fn();
    const onDone = vi.fn();
    render(<AddBookSheet {...buildProps({ onKeepSearching, onDone })} />);

    fireEvent.click(screen.getByText("Add to library"));

    expect(await screen.findByText("Added to library")).toBeTruthy();
    expect(screen.getByText("Dune is now in your library.")).toBeTruthy();

    fireEvent.click(screen.getByText("Keep searching"));
    expect(onKeepSearching).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Done"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
