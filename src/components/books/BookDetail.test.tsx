import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BookDetail, type BookDetailProps } from "./BookDetail";
import { abandonBook, removeBook, updateBookCategory, updateBookRating, updateBookStatus } from "@/actions/books";
import type { Book, LibraryEntry } from "@/types/books";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/actions/books", () => ({
  updateBookStatus: vi.fn(),
  updateBookCategory: vi.fn(),
  abandonBook: vi.fn(),
  updateBookRating: vi.fn(),
  removeBook: vi.fn(),
}));

const mockedUpdateBookStatus = vi.mocked(updateBookStatus);
const mockedUpdateBookCategory = vi.mocked(updateBookCategory);
const mockedAbandonBook = vi.mocked(abandonBook);
const mockedUpdateBookRating = vi.mocked(updateBookRating);
const mockedRemoveBook = vi.mocked(removeBook);

function buildBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    googleBooksId: "zyTCAlFPjgYC",
    title: "Dune",
    authors: ["Frank Herbert"],
    description: "A stunning blend of adventure and mysticism, set on the desert planet Arrakis.",
    thumbnail: null,
    publishedDate: "1965-08-01",
    pageCount: 412,
    isbn13: "9780441172719",
    ...overrides,
  };
}

function buildEntry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    userBookId: "ub-1",
    status: "reading",
    category: "novel",
    rating: null,
    abandoned: false,
    startedAt: null,
    finishedAt: null,
    book: buildBook(),
    ...overrides,
  };
}

function buildProps(overrides: Partial<BookDetailProps> = {}): BookDetailProps {
  return {
    entry: buildEntry(),
    ...overrides,
  };
}

afterEach(() => {
  push.mockClear();
  refresh.mockClear();
  mockedUpdateBookStatus.mockReset();
  mockedUpdateBookCategory.mockReset();
  mockedAbandonBook.mockReset();
  mockedUpdateBookRating.mockReset();
  mockedRemoveBook.mockReset();
  cleanup();
});

describe("BookDetail", () => {
  it("renders title, authors, status and category badges, and metadata", () => {
    render(<BookDetail {...buildProps()} />);

    expect(screen.getByRole("heading", { name: "Dune" })).toBeTruthy();
    expect(screen.getByText("Frank Herbert")).toBeTruthy();
    expect(screen.getByText("Reading").closest("button")).toBeTruthy();
    expect(screen.getByText("Novel").closest("button")).toBeTruthy();

    expect(screen.getByText("412")).toBeTruthy();
    expect(screen.getByText("1965")).toBeTruthy();
    expect(screen.getByText("9780441172719")).toBeTruthy();
  });

  it("renders em dashes for missing metadata and omits authors/description blocks", () => {
    const entry = buildEntry({
      book: buildBook({
        authors: [],
        description: null,
        pageCount: null,
        publishedDate: null,
        isbn13: null,
      }),
    });
    render(<BookDetail {...buildProps({ entry })} />);

    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.queryByText("Frank Herbert")).toBeNull();
    expect(
      screen.queryByText(
        "A stunning blend of adventure and mysticism, set on the desert planet Arrakis.",
      ),
    ).toBeNull();
  });

  it("points the back link to /novels for a novel entry", () => {
    render(<BookDetail {...buildProps({ entry: buildEntry({ category: "novel" }) })} />);

    expect(screen.getByRole("link", { name: "Novels" }).getAttribute("href")).toBe("/novels");
  });

  it("points the back link to /non-fiction for a non_fiction entry", () => {
    render(<BookDetail {...buildProps({ entry: buildEntry({ category: "non_fiction" }) })} />);

    expect(screen.getByRole("link", { name: "Non-Fiction" }).getAttribute("href")).toBe(
      "/non-fiction",
    );
  });

  it("changes the reading status and refreshes after selecting a new option", async () => {
    mockedUpdateBookStatus.mockResolvedValue({ success: true, data: undefined });
    render(<BookDetail {...buildProps()} />);

    fireEvent.click(screen.getByText("Reading").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Read"));

    await waitFor(() => {
      expect(mockedUpdateBookStatus).toHaveBeenCalledWith("ub-1", "read");
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Read").closest("button")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("changes the category and refreshes after selecting a new option", async () => {
    mockedUpdateBookCategory.mockResolvedValue({ success: true, data: undefined });
    render(<BookDetail {...buildProps()} />);

    fireEvent.click(screen.getByText("Novel").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Non-Fiction"));

    await waitFor(() => {
      expect(mockedUpdateBookCategory).toHaveBeenCalledWith("ub-1", "non_fiction");
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Non-Fiction/ })).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("closes the status sheet without calling the action when the current status is re-selected", () => {
    render(<BookDetail {...buildProps()} />);

    fireEvent.click(screen.getByText("Reading").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Reading"));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockedUpdateBookStatus).not.toHaveBeenCalled();
  });

  it("removes the book and navigates back after confirming", async () => {
    mockedRemoveBook.mockResolvedValue({ success: true, data: undefined });
    render(<BookDetail {...buildProps()} />);

    fireEvent.click(screen.getByText("Remove from library"));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Remove from library?")).toBeTruthy();

    fireEvent.click(within(dialog).getByText("Remove"));

    await waitFor(() => {
      expect(mockedRemoveBook).toHaveBeenCalledWith("ub-1");
    });

    expect(push).toHaveBeenCalledWith("/novels");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows an error message and keeps the previous status when the action fails", async () => {
    mockedUpdateBookStatus.mockResolvedValue({ success: false, error: "Not found" });
    render(<BookDetail {...buildProps()} />);

    fireEvent.click(screen.getByText("Reading").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Read"));

    expect(await screen.findByText("Not found")).toBeTruthy();

    const readingButtons = screen.getAllByRole("button", { name: /Reading/ });
    const badgeButton = readingButtons.find((button) => !dialog.contains(button));
    expect(badgeButton).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows the Abandon option in the status sheet when the book is reading", () => {
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "reading" }) })} />);

    fireEvent.click(screen.getByText("Reading").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Abandon")).toBeTruthy();
  });

  it("omits the Abandon option in the status sheet when the book is read", () => {
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "read" }) })} />);

    fireEvent.click(screen.getByText("Read").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Abandon")).toBeNull();
  });

  it("omits the Abandon option in the status sheet when the book is want to read", () => {
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "want_to_read" }) })} />);

    fireEvent.click(screen.getByText("Want to Read").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Abandon")).toBeNull();
  });

  it("abandons the book and refreshes after confirming", async () => {
    mockedAbandonBook.mockResolvedValue({ success: true, data: undefined });
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "reading" }) })} />);

    fireEvent.click(screen.getByText("Reading").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Abandon"));

    await waitFor(() => {
      expect(mockedAbandonBook).toHaveBeenCalledWith("ub-1");
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Abandoned").closest("button")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("shows an error message and keeps the previous status when abandoning fails", async () => {
    mockedAbandonBook.mockResolvedValue({ success: false, error: "Not found" });
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "reading" }) })} />);

    fireEvent.click(screen.getByText("Reading").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Abandon"));

    expect(await screen.findByText("Not found")).toBeTruthy();

    const readingButtons = screen.getAllByRole("button", { name: /Reading/ });
    const badgeButton = readingButtons.find((button) => !dialog.contains(button));
    expect(badgeButton).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not render the rating picker when the book is reading", () => {
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "reading" }) })} />);

    expect(screen.queryByText("Your rating")).toBeNull();
  });

  it("does not render the rating picker when the book is want to read", () => {
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "want_to_read" }) })} />);

    expect(screen.queryByText("Your rating")).toBeNull();
  });

  it("renders the rating picker when the book is read", () => {
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "read" }) })} />);

    expect(screen.getByText("Your rating")).toBeTruthy();
  });

  it("renders the rating picker when the book is read and abandoned", () => {
    render(
      <BookDetail
        {...buildProps({ entry: buildEntry({ status: "read", abandoned: true }) })}
      />,
    );

    expect(screen.getByText("Your rating")).toBeTruthy();
  });

  it("selects a rating and refreshes after confirming", async () => {
    mockedUpdateBookRating.mockResolvedValue({ success: true, data: undefined });
    render(<BookDetail {...buildProps({ entry: buildEntry({ status: "read", rating: null }) })} />);

    const goodButton = screen.getByRole("button", { name: /Good/ });
    fireEvent.click(goodButton);

    await waitFor(() => {
      expect(mockedUpdateBookRating).toHaveBeenCalledWith("ub-1", "good");
    });

    expect(goodButton.getAttribute("aria-pressed")).toBe("true");
    expect(refresh).toHaveBeenCalled();
  });

  it("clears a rating when the active option is tapped again", async () => {
    mockedUpdateBookRating.mockResolvedValue({ success: true, data: undefined });
    render(
      <BookDetail
        {...buildProps({ entry: buildEntry({ status: "read", rating: "good" }) })}
      />,
    );

    const goodButton = screen.getByRole("button", { name: /Good/ });
    expect(goodButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(goodButton);

    await waitFor(() => {
      expect(mockedUpdateBookRating).toHaveBeenCalledWith("ub-1", null);
    });

    expect(goodButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("reverts the rating and shows an error when updating the rating fails", async () => {
    mockedUpdateBookRating.mockResolvedValue({ success: false, error: "Not found" });
    render(
      <BookDetail
        {...buildProps({ entry: buildEntry({ status: "read", rating: "good" }) })}
      />,
    );

    const goodButton = screen.getByRole("button", { name: /Good/ });
    fireEvent.click(goodButton);

    expect(await screen.findByText("Not found")).toBeTruthy();
    expect(goodButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders the Abandoned badge instead of Read, with no Abandon row in the status sheet", () => {
    render(
      <BookDetail
        {...buildProps({ entry: buildEntry({ status: "read", abandoned: true }) })}
      />,
    );

    expect(screen.getByText("Abandoned").closest("button")).toBeTruthy();
    expect(screen.queryByText("Read")).toBeNull();

    fireEvent.click(screen.getByText("Abandoned").closest("button") as HTMLButtonElement);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Reading")).toBeTruthy();
    expect(within(dialog).getByText("Read")).toBeTruthy();
    expect(within(dialog).getByText("Want to Read")).toBeTruthy();
    expect(within(dialog).queryByText("Abandon")).toBeNull();
  });
});
