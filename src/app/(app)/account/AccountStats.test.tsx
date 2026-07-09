import { HttpResponse, http } from "msw";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { server } from "@/test/mocks/server";
import type { BookStats } from "@/types/books";

import { AccountStats } from "./AccountStats";

function buildStats(overrides: Partial<BookStats> = {}): BookStats {
  return {
    total: 42,
    novels: { reading: 2, read: 18, want_to_read: 5 },
    non_fiction: { reading: 1, read: 12, want_to_read: 4 },
    totalPagesRead: 8420,
    ...overrides,
  };
}

function zeroStats(): BookStats {
  return {
    total: 0,
    novels: { reading: 0, read: 0, want_to_read: 0 },
    non_fiction: { reading: 0, read: 0, want_to_read: 0 },
    totalPagesRead: 0,
  };
}

afterEach(() => {
  cleanup();
});

describe("AccountStats", () => {
  it("shows a loading indicator before the fetch resolves", () => {
    server.use(
      http.get("/api/stats", async () => {
        await new Promise(() => {
          // never resolves within this test
        });
        return HttpResponse.json(buildStats());
      }),
    );

    render(<AccountStats />);

    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("renders the total and the per-category counts on success", async () => {
    const stats = buildStats();

    server.use(http.get("/api/stats", () => HttpResponse.json(stats)));

    render(<AccountStats />);

    expect(await screen.findByText("42")).toBeTruthy();
    expect(screen.getByText("Total books")).toBeTruthy();

    expect(screen.getByText("Novels")).toBeTruthy();
    expect(screen.getByText("Non-Fiction")).toBeTruthy();

    const novelsCard = screen.getByText("Novels").closest("div");
    const nonFictionCard = screen.getByText("Non-Fiction").closest("div");
    expect(novelsCard).toBeTruthy();
    expect(nonFictionCard).toBeTruthy();

    expect(within(novelsCard as HTMLElement).getByText("2")).toBeTruthy();
    expect(within(novelsCard as HTMLElement).getByText("18")).toBeTruthy();
    expect(within(novelsCard as HTMLElement).getByText("5")).toBeTruthy();

    expect(within(nonFictionCard as HTMLElement).getByText("1")).toBeTruthy();
    expect(within(nonFictionCard as HTMLElement).getByText("12")).toBeTruthy();
    expect(within(nonFictionCard as HTMLElement).getByText("4")).toBeTruthy();
  });

  it("renders a zero-state without crashing or hiding sections", async () => {
    server.use(http.get("/api/stats", () => HttpResponse.json(zeroStats())));

    render(<AccountStats />);

    expect(await screen.findByText("Total books")).toBeTruthy();
    expect(screen.getByText("Novels")).toBeTruthy();
    expect(screen.getByText("Non-Fiction")).toBeTruthy();

    const zeros = screen.getAllByText("0");
    // total + 3 novels statuses + 3 non-fiction statuses
    expect(zeros.length).toBe(7);
  });

  it("shows an error message and Retry button on a non-ok response, and refetches on retry", async () => {
    let callCount = 0;
    const stats = buildStats();

    server.use(
      http.get("/api/stats", () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
        return HttpResponse.json(stats);
      }),
    );

    render(<AccountStats />);

    expect(await screen.findByText("Couldn't load your stats. Pull to retry.")).toBeTruthy();
    const retryButton = screen.getByText("Retry");
    expect(retryButton).toBeTruthy();

    retryButton.click();

    expect(await screen.findByText("42")).toBeTruthy();
    await waitFor(() => expect(callCount).toBe(2));
  });
});
