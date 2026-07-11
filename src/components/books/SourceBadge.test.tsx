import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SourceBadge } from "./SourceBadge";

afterEach(() => {
  cleanup();
});

describe("SourceBadge", () => {
  it("renders 'OL' for an openLibrary source", () => {
    render(<SourceBadge source="openLibrary" />);

    expect(screen.getByText("OL")).toBeTruthy();
  });

  it("renders 'GB' for a googleBooks source", () => {
    render(<SourceBadge source="googleBooks" />);

    expect(screen.getByText("GB")).toBeTruthy();
  });

  it("is aria-hidden, since the group header already announces the source", () => {
    render(<SourceBadge source="googleBooks" />);

    expect(screen.getByText("GB").getAttribute("aria-hidden")).toBe("true");
  });
});
