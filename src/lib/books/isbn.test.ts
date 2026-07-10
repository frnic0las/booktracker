import { describe, expect, it } from "vitest";

import { isValidIsbn, normalizeIsbn } from "./isbn";

describe("normalizeIsbn", () => {
  it("normalizes an ISBN-13 with and without separators", () => {
    expect(normalizeIsbn("9782070368228")).toBe("9782070368228");
    expect(normalizeIsbn("978-2-07-036822-8")).toBe("9782070368228");
    expect(normalizeIsbn("978 2 07 036822 8")).toBe("9782070368228");
  });

  it("normalizes an ISBN-10 with a trailing X (case-insensitive)", () => {
    expect(normalizeIsbn("080442957X")).toBe("080442957X");
    expect(normalizeIsbn("0-8044-2957-x")).toBe("080442957X");
  });

  it("returns null for an invalid checksum", () => {
    expect(normalizeIsbn("9782070368229")).toBeNull();
    expect(normalizeIsbn("0804429570")).toBeNull();
  });

  it("returns null for non-ISBN input", () => {
    expect(normalizeIsbn("the hobbit")).toBeNull();
    expect(normalizeIsbn("1984")).toBeNull();
    expect(normalizeIsbn("123456789012")).toBeNull();
  });
});

describe("isValidIsbn", () => {
  it("is true for checksum-valid ISBNs", () => {
    expect(isValidIsbn("9782070368228")).toBe(true);
    expect(isValidIsbn("080442957X")).toBe(true);
  });

  it("is false for invalid or partial input", () => {
    expect(isValidIsbn("9782070368229")).toBe(false);
    expect(isValidIsbn("978207036822")).toBe(false);
    expect(isValidIsbn("")).toBe(false);
  });
});
