import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges plain class strings", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("drops falsy conditional classes", () => {
    const isActive = false;
    expect(cn("px-4", isActive && "bg-blue-500", "py-2")).toBe("px-4 py-2");
  });

  it("keeps truthy conditional classes", () => {
    const isActive = true;
    expect(cn("px-4", isActive && "bg-blue-500")).toBe("px-4 bg-blue-500");
  });

  it("resolves conflicting Tailwind utilities, keeping the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm text-gray-500", "text-lg")).toBe("text-gray-500 text-lg");
  });

  it("supports arrays and object syntax from clsx", () => {
    expect(cn(["flex", "flex-col"], { "gap-2": true, hidden: false })).toBe(
      "flex flex-col gap-2",
    );
  });

  it("ignores null and undefined values", () => {
    expect(cn("rounded-lg", null, undefined, "shadow")).toBe(
      "rounded-lg shadow",
    );
  });

  it("returns an empty string when given no meaningful input", () => {
    expect(cn()).toBe("");
    expect(cn(false, undefined, null)).toBe("");
  });
});
