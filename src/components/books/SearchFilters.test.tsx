import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchFilters, type SearchFiltersProps } from "./SearchFilters";

function buildProps(overrides: Partial<SearchFiltersProps> = {}): SearchFiltersProps {
  return {
    lang: "",
    author: "",
    onLangChange: vi.fn(),
    onAuthorChange: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("SearchFilters", () => {
  it("hides the filter panel by default and reveals it when the toggle is clicked", () => {
    render(<SearchFilters {...buildProps()} />);

    const toggle = screen.getByRole("button", { name: /^Filters/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("group", { name: "Language" })).toBeNull();
    expect(screen.queryByLabelText("Filter by author")).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("group", { name: "Language" })).toBeTruthy();
    expect(screen.getByLabelText("Filter by author")).toBeTruthy();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("group", { name: "Language" })).toBeNull();
  });

  it("calls onLangChange with the language code when a chip is clicked, and reflects selection via aria-pressed", () => {
    const onLangChange = vi.fn();
    const props = buildProps({ onLangChange });
    const { rerender } = render(<SearchFilters {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /^Filters/i }));
    fireEvent.click(screen.getByRole("button", { name: "French" }));

    expect(onLangChange).toHaveBeenCalledWith("fr");
    expect(screen.getByRole("button", { name: "French" }).getAttribute("aria-pressed")).toBe("false");

    rerender(<SearchFilters {...props} lang="fr" />);

    expect(screen.getByRole("button", { name: "French" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("reveals the language code input and clears lang when 'Other' is clicked", () => {
    const onLangChange = vi.fn();
    render(<SearchFilters {...buildProps({ onLangChange })} />);

    fireEvent.click(screen.getByRole("button", { name: /^Filters/i }));
    expect(screen.queryByLabelText("Language code")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Other" }));

    expect(onLangChange).toHaveBeenCalledWith("");
    expect(screen.getByLabelText("Language code")).toBeTruthy();
  });

  it("lower-cases and truncates the language code input to 2 characters", () => {
    const onLangChange = vi.fn();
    render(<SearchFilters {...buildProps({ onLangChange })} />);

    fireEvent.click(screen.getByRole("button", { name: /^Filters/i }));
    fireEvent.click(screen.getByRole("button", { name: "Other" }));

    const input = screen.getByLabelText("Language code");
    fireEvent.change(input, { target: { value: "IT" } });
    expect(onLangChange).toHaveBeenCalledWith("it");

    fireEvent.change(input, { target: { value: "ITALY" } });
    expect(onLangChange).toHaveBeenCalledWith("it");
  });

  it("calls onAuthorChange when typing in the author input", () => {
    const onAuthorChange = vi.fn();
    render(<SearchFilters {...buildProps({ onAuthorChange })} />);

    fireEvent.click(screen.getByRole("button", { name: /^Filters/i }));
    fireEvent.change(screen.getByLabelText("Filter by author"), { target: { value: "Herbert" } });

    expect(onAuthorChange).toHaveBeenCalledWith("Herbert");
  });

  it("shows a count badge and dismissible chips when collapsed with active filters", () => {
    const onLangChange = vi.fn();
    const onAuthorChange = vi.fn();
    render(
      <SearchFilters
        {...buildProps({ lang: "fr", author: "Herbert", onLangChange, onAuthorChange })}
      />,
    );

    expect(screen.getByRole("button", { name: /^Filters/i }).getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("French")).toBeTruthy();
    expect(screen.getByText("Herbert")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Clear language filter"));
    expect(onLangChange).toHaveBeenCalledWith("");

    fireEvent.click(screen.getByText("Clear"));
    expect(onLangChange).toHaveBeenCalledWith("");
    expect(onAuthorChange).toHaveBeenCalledWith("");
  });

  it("does not count a partial (1-char) lang code as an active filter", () => {
    render(<SearchFilters {...buildProps({ lang: "f" })} />);

    expect(screen.queryByText("1")).toBeNull();
    expect(screen.queryByLabelText("Clear language filter")).toBeNull();
    expect(screen.queryByText("Clear")).toBeNull();
  });
});
