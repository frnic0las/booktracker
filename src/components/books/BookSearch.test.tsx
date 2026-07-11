import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BookSearch } from "./BookSearch";
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

// BookSearch statically imports BarcodeScanner, which pulls in ZXing. Mock the
// decoder so opening the scanner and driving a decode work without a camera.
const stop = vi.fn();
const decodeFromConstraints = vi.fn();
let fireDecode: (result: { getText: () => string }) => void = () => {};

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromConstraints(
      _constraints: unknown,
      _video: unknown,
      cb: (result: { getText: () => string }) => void,
    ) {
      fireDecode = cb;
      return decodeFromConstraints(_constraints, _video, cb);
    }
  },
}));

vi.mock("@zxing/library", () => ({
  BarcodeFormat: { EAN_13: 3 },
  DecodeHintType: { POSSIBLE_FORMATS: 2 },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) });
  vi.stubGlobal("fetch", fetchMock);
  stop.mockReset();
  decodeFromConstraints.mockReset();
  decodeFromConstraints.mockResolvedValue({ stop });
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

  it("opens the scanner and searches with the decoded ISBN", async () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.click(screen.getByRole("button", { name: "Scan ISBN barcode" }));

    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());
    expect(screen.getByText("Point at the barcode on the back cover")).toBeTruthy();

    fireDecode({ getText: () => "9782070368228" });

    await waitFor(
      () => {
        const url = lastFetchedUrl();
        expect(url.pathname).toBe("/api/books/search");
        expect(url.searchParams.get("q")).toBe("9782070368228");
      },
      { timeout: 2000 },
    );
  });

  it("searches with a manually entered ISBN", async () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.click(screen.getByRole("button", { name: "Scan ISBN barcode" }));
    fireEvent.click(screen.getByRole("button", { name: "Enter ISBN manually" }));

    fireEvent.change(screen.getByLabelText("ISBN"), { target: { value: "9782070368228" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(
      () => {
        const url = lastFetchedUrl();
        expect(url.searchParams.get("q")).toBe("9782070368228");
      },
      { timeout: 2000 },
    );
  });

  it("renders the OpenLibrary group before the Google Books group regardless of API response order", async () => {
    const googleBooksResult = buildResult({ id: "gb1", title: "Dune", source: "googleBooks" });
    const openLibraryResult = buildResult({ id: "OL1W", title: "Dune Messiah", source: "openLibrary" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [googleBooksResult, openLibraryResult] }),
    });

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    await waitFor(
      () => {
        expect(screen.getByText("OpenLibrary")).toBeTruthy();
        expect(screen.getByText("Google Books")).toBeTruthy();
      },
      { timeout: 1500 },
    );

    const openLibraryHeader = screen.getByText("OpenLibrary");
    const googleBooksHeader = screen.getByText("Google Books");

    // DOCUMENT_POSITION_FOLLOWING means googleBooksHeader comes after
    // openLibraryHeader in the DOM, i.e. OpenLibrary is rendered first.
    expect(
      openLibraryHeader.compareDocumentPosition(googleBooksHeader) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders only the matching group header for a single-source response", async () => {
    const openLibraryResult = buildResult({ id: "OL1W", title: "Dune", source: "openLibrary" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [openLibraryResult] }),
    });

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    await waitFor(() => expect(screen.getByText("OpenLibrary")).toBeTruthy(), { timeout: 1500 });

    expect(screen.queryByText("Google Books")).toBeNull();
  });

  it("shows the searching skeleton while loading, not the old 'Searching…' text", async () => {
    let resolveFetch: (value: { ok: boolean; json: () => Promise<{ results: BookSearchResult[] }> }) => void =
      () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    await waitFor(() => expect(screen.getByLabelText("Searching")).toBeTruthy(), { timeout: 1500 });

    expect(screen.queryByText("Searching…")).toBeNull();

    resolveFetch({ ok: true, json: async () => ({ results: [] }) });
  });

  it("shows 'Book not found' naming both catalogs when there are no results", async () => {
    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Zzzzzz" } });

    await waitFor(
      () =>
        expect(
          screen.getByText(
            "Nothing matched “Zzzzzz” in OpenLibrary or Google Books. Check the spelling, or try the ISBN.",
          ),
        ).toBeTruthy(),
      { timeout: 1500 },
    );

    expect(screen.getByText("Book not found")).toBeTruthy();
  });

  it("renders a source badge on every row, alongside the group headers", async () => {
    const googleBooksResult = buildResult({ id: "gb1", title: "Dune", source: "googleBooks" });
    const openLibraryResult = buildResult({ id: "OL1W", title: "Dune Messiah", source: "openLibrary" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [openLibraryResult, googleBooksResult] }),
    });

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    await waitFor(() => expect(screen.getByText("Dune Messiah")).toBeTruthy(), { timeout: 1500 });

    expect(screen.getByText("OpenLibrary")).toBeTruthy();
    expect(screen.getByText("Google Books")).toBeTruthy();
    expect(screen.getAllByText("OL")).toHaveLength(1);
    expect(screen.getAllByText("GB")).toHaveLength(1);
  });

  it("shows 'Book not found' naming both catalogs when both sources answered with no results", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], failedSources: [] }),
    });

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Zzzzzz" } });

    await waitFor(
      () =>
        expect(
          screen.getByText(
            "Nothing matched “Zzzzzz” in OpenLibrary or Google Books. Check the spelling, or try the ISBN.",
          ),
        ).toBeTruthy(),
      { timeout: 1500 },
    );

    expect(screen.getByText("Book not found")).toBeTruthy();
  });

  it("names only Google Books when OpenLibrary failed and Google Books returned no results", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], failedSources: ["openLibrary"] }),
    });

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Zzzzzz" } });

    await waitFor(
      () =>
        expect(
          screen.getByText(
            "Nothing matched “Zzzzzz” in Google Books. OpenLibrary couldn’t be reached — try again in a moment.",
          ),
        ).toBeTruthy(),
      { timeout: 1500 },
    );

    expect(screen.getByText("Book not found")).toBeTruthy();
  });

  it("names only OpenLibrary when Google Books failed and OpenLibrary returned no results", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], failedSources: ["googleBooks"] }),
    });

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Zzzzzz" } });

    await waitFor(
      () =>
        expect(
          screen.getByText(
            "Nothing matched “Zzzzzz” in OpenLibrary. Google Books couldn’t be reached — try again in a moment.",
          ),
        ).toBeTruthy(),
      { timeout: 1500 },
    );

    expect(screen.getByText("Book not found")).toBeTruthy();
  });

  it("shows a degraded notice naming the failed source above the results when a partial failure still has results", async () => {
    const googleBooksResult = buildResult({ id: "gb1", title: "Dune", source: "googleBooks" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [googleBooksResult], failedSources: ["openLibrary"] }),
    });

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    await waitFor(
      () =>
        expect(
          screen.getByText("OpenLibrary wasn’t reachable — these results are partial."),
        ).toBeTruthy(),
      { timeout: 1500 },
    );

    expect(screen.getByText("Dune")).toBeTruthy();
  });

  it("renders no degraded notice when failedSources is empty", async () => {
    const googleBooksResult = buildResult({ id: "gb1", title: "Dune", source: "googleBooks" });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [googleBooksResult], failedSources: [] }),
    });

    render(<BookSearch initialCategory="novel" from="novels" />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy(), { timeout: 1500 });

    expect(screen.queryByText(/wasn’t reachable/)).toBeNull();
    expect(screen.queryByText(/weren’t reachable/)).toBeNull();
  });
});
