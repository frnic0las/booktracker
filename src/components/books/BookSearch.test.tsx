import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BookSearch } from "./BookSearch";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// BookSearch renders AddBookSheet, which imports the "use server" addBook
// action. That module pulls in the Auth.js config, which isn't safe to
// import in this jsdom test environment, so it is mocked out here.
vi.mock("@/actions/books", () => ({
  addBook: vi.fn(),
}));

afterEach(() => {
  push.mockClear();
  cleanup();
});

describe("BookSearch", () => {
  it("shows the 'Search for a book' empty state before any query is typed", () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    expect(screen.getByText("Search for a book")).toBeTruthy();
    expect(
      screen.getByText("Search for a title or author to get started."),
    ).toBeTruthy();
  });

  it("reflects typed input in the search field", () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    const input = screen.getByLabelText("Search books") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Dune" } });

    expect(input.value).toBe("Dune");
  });

  it("navigates back to the origin tab when Cancel is clicked", () => {
    render(<BookSearch initialCategory="non_fiction" from="non-fiction" />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(push).toHaveBeenCalledWith("/non-fiction");
  });
});
