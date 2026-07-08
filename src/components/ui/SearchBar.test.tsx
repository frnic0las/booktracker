import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchBar } from "./SearchBar";

afterEach(() => {
  cleanup();
});

describe("SearchBar", () => {
  it("has an accessible label of 'Search books'", () => {
    render(<SearchBar value="" onChange={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Search books")).toBeTruthy();
  });

  it("calls onChange with the new value when typing", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Search books"), { target: { value: "Dune" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("Dune");
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<SearchBar value="Dune" onChange={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders the placeholder text when provided", () => {
    render(<SearchBar value="" onChange={vi.fn()} onCancel={vi.fn()} placeholder="Title or author" />);

    expect(screen.getByPlaceholderText("Title or author")).toBeTruthy();
  });
});
