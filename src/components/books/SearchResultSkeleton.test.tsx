import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SearchResultSkeleton } from "./SearchResultSkeleton";

afterEach(() => {
  cleanup();
});

describe("SearchResultSkeleton", () => {
  it("exposes the busy state to assistive tech", () => {
    render(<SearchResultSkeleton />);

    const region = screen.getByLabelText("Searching");
    expect(region.getAttribute("aria-busy")).toBe("true");
  });

  it("renders five skeleton rows", () => {
    const { container } = render(<SearchResultSkeleton />);

    const region = screen.getByLabelText("Searching");
    expect(region.children).toHaveLength(5);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
