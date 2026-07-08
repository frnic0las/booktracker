import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SubTabs, type SubTab } from "./SubTabs";

type Status = "reading" | "read" | "want_to_read";

const TABS: SubTab<Status>[] = [
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
  { value: "want_to_read", label: "Want to Read" },
];

afterEach(() => {
  cleanup();
});

describe("SubTabs", () => {
  it("renders all tab labels", () => {
    render(<SubTabs tabs={TABS} value="reading" onChange={vi.fn()} />);

    expect(screen.getByText("Reading")).toBeTruthy();
    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.getByText("Want to Read")).toBeTruthy();
  });

  it("marks the active tab with aria-pressed=true and the others with aria-pressed=false", () => {
    render(<SubTabs tabs={TABS} value="read" onChange={vi.fn()} />);

    expect(screen.getByText("Reading").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Read").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Want to Read").getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onChange with the clicked tab's value", () => {
    const onChange = vi.fn();
    render(<SubTabs tabs={TABS} value="reading" onChange={onChange} />);

    fireEvent.click(screen.getByText("Want to Read"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("want_to_read");
  });
});
