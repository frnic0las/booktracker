import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebounce } from "./useDebounce";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("useDebounce", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("Dune", 300));

    expect(result.current).toBe("Dune");
  });

  it("does not update the value before the delay has elapsed", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "D" },
    });

    rerender({ value: "Du" });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("D");
  });

  it("updates the value once the delay has elapsed", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "D" },
    });

    rerender({ value: "Dune" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("Dune");
  });

  it("only reflects the latest value when it changes rapidly within the delay window", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "D" },
    });

    rerender({ value: "Du" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "Dune" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("Dune");
  });
});
