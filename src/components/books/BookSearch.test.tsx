import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  push.mockClear();
  cleanup();
  vi.unstubAllGlobals();
});

function lastFetchedUrl(): URL {
  const call = fetchMock.mock.calls.at(-1) as [string, RequestInit] | undefined;
  if (!call) {
    throw new Error("fetch was not called");
  }
  return new URL(call[0], "http://localhost");
}

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

  it("fetches with only the q param when no filters are set", async () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const url = lastFetchedUrl();
    expect(url.pathname).toBe("/api/books/search");
    expect(url.searchParams.get("q")).toBe("Dune");
    expect(url.searchParams.has("lang")).toBe(false);
    expect(url.searchParams.has("author")).toBe(false);
  });

  it("includes lang and author params once filters are picked", async () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });
    fireEvent.click(screen.getByRole("button", { name: /^Filters/i }));
    fireEvent.click(screen.getByRole("button", { name: "French" }));
    fireEvent.change(screen.getByLabelText("Filter by author"), { target: { value: "Herbert" } });

    await waitFor(
      () => {
        const url = lastFetchedUrl();
        expect(url.searchParams.get("q")).toBe("Dune");
        expect(url.searchParams.get("lang")).toBe("fr");
        expect(url.searchParams.get("author")).toBe("Herbert");
      },
      { timeout: 1500 },
    );
  });

  it("omits lang from the URL while the ISO code is a partial (1-char) value", async () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });
    fireEvent.click(screen.getByRole("button", { name: /^Filters/i }));
    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    fireEvent.change(screen.getByLabelText("Language code"), { target: { value: "f" } });

    await waitFor(
      () => {
        const url = lastFetchedUrl();
        expect(url.searchParams.get("q")).toBe("Dune");
        expect(url.searchParams.has("lang")).toBe(false);
      },
      { timeout: 1500 },
    );
  });

  it("keeps the selected filters when the main query is cleared", async () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.click(screen.getByRole("button", { name: /^Filters/i }));
    fireEvent.click(screen.getByRole("button", { name: "French" }));
    fireEvent.change(screen.getByLabelText("Filter by author"), { target: { value: "Herbert" } });
    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    await waitFor(
      () => {
        const url = lastFetchedUrl();
        expect(url.searchParams.get("lang")).toBe("fr");
        expect(url.searchParams.get("author")).toBe("Herbert");
      },
      { timeout: 1500 },
    );

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "" } });

    expect(screen.getByRole("button", { name: "French" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("Filter by author") as HTMLInputElement).value).toBe("Herbert");
  });
});
