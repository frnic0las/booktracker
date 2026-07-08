import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SegmentedControl, type SegmentedControlOption } from "./SegmentedControl";

type Status = "reading" | "read" | "want_to_read";

const STATUS_OPTIONS: SegmentedControlOption<Status>[] = [
  { value: "reading", label: "Reading", dotClass: "bg-reading" },
  { value: "read", label: "Read", dotClass: "bg-read" },
  { value: "want_to_read", label: "Want", dotClass: "bg-want" },
];

type Category = "novel" | "non_fiction";

const CATEGORY_OPTIONS: SegmentedControlOption<Category>[] = [
  { value: "novel", label: "Novel" },
  { value: "non_fiction", label: "Non-Fiction" },
];

afterEach(() => {
  cleanup();
});

describe("SegmentedControl", () => {
  it("renders one button per option", () => {
    render(<SegmentedControl options={CATEGORY_OPTIONS} value="novel" onChange={vi.fn()} />);

    expect(screen.getByText("Novel")).toBeTruthy();
    expect(screen.getByText("Non-Fiction")).toBeTruthy();
  });

  it("marks the active option with aria-pressed=true and the others with aria-pressed=false", () => {
    render(<SegmentedControl options={STATUS_OPTIONS} value="read" onChange={vi.fn()} />);

    expect(screen.getByText("Reading").closest("button")?.getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(screen.getByText("Read").closest("button")?.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Want").closest("button")?.getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("calls onChange with the clicked option's value", () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={STATUS_OPTIONS} value="reading" onChange={onChange} />);

    fireEvent.click(screen.getByText("Read"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("read");
  });

  it("renders the status dot only on the active option when dotClass is provided", () => {
    render(<SegmentedControl options={STATUS_OPTIONS} value="reading" onChange={vi.fn()} />);

    const readingButton = screen.getByText("Reading").closest("button");
    const readButton = screen.getByText("Read").closest("button");

    expect(readingButton?.querySelector("span.bg-reading")).not.toBeNull();
    expect(readButton?.querySelector("span.bg-read")).toBeNull();
  });

  it("does not render a dot when dotClass is not provided, even on the active option", () => {
    const { container } = render(
      <SegmentedControl options={CATEGORY_OPTIONS} value="novel" onChange={vi.fn()} />,
    );

    expect(container.querySelector("span")).toBeNull();
  });
});
