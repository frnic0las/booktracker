import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IsbnEntrySheet } from "./IsbnEntrySheet";

afterEach(cleanup);

describe("IsbnEntrySheet", () => {
  it("does not render when closed", () => {
    render(<IsbnEntrySheet open={false} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText("ISBN")).toBeNull();
  });

  it("keeps Search disabled until a valid ISBN is entered", () => {
    render(<IsbnEntrySheet open onClose={vi.fn()} onSubmit={vi.fn()} />);

    const search = screen.getByRole("button", { name: "Search" }) as HTMLButtonElement;
    expect(search.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("ISBN"), { target: { value: "9782070368228" } });
    expect(search.disabled).toBe(false);
  });

  it("submits the normalized ISBN and strips separators", () => {
    const onSubmit = vi.fn();
    render(<IsbnEntrySheet open onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("ISBN"), { target: { value: "978-2-07-036822-8" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSubmit).toHaveBeenCalledWith("9782070368228");
  });

  it("shows an inline error for a complete but invalid ISBN", () => {
    render(<IsbnEntrySheet open onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("ISBN"), { target: { value: "9782070368229" } });

    expect(screen.getByText(/doesn't look right/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Search" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onClose from Cancel", () => {
    const onClose = vi.fn();
    render(<IsbnEntrySheet open onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });
});
