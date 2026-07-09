import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RatingPicker, type RatingPickerProps } from "./RatingPicker";

function buildProps(overrides: Partial<RatingPickerProps> = {}): RatingPickerProps {
  return {
    value: null,
    onChange: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("RatingPicker", () => {
  it("renders a group with the three rating options", () => {
    render(<RatingPicker {...buildProps()} />);

    const group = screen.getByRole("group", { name: "Rating" });
    expect(group).toBeTruthy();
    expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Average/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bad/ })).toBeTruthy();
  });

  it("marks only the selected option as pressed", () => {
    render(<RatingPicker {...buildProps({ value: "average" })} />);

    expect(screen.getByRole("button", { name: /Good/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(screen.getByRole("button", { name: /Average/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: /Bad/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("calls onChange with the tapped rating when nothing is selected", () => {
    const onChange = vi.fn();
    render(<RatingPicker {...buildProps({ value: null, onChange })} />);

    screen.getByRole("button", { name: /Bad/ }).click();

    expect(onChange).toHaveBeenCalledWith("bad");
  });

  it("calls onChange with null when the selected rating is tapped again", () => {
    const onChange = vi.fn();
    render(<RatingPicker {...buildProps({ value: "bad", onChange })} />);

    screen.getByRole("button", { name: /Bad/ }).click();

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("disables every option when disabled is true", () => {
    render(<RatingPicker {...buildProps({ disabled: true })} />);

    expect(screen.getByRole("button", { name: /Good/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /Average/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /Bad/ }).hasAttribute("disabled")).toBe(true);
  });
});
