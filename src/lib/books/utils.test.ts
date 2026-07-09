import { describe, expect, it } from "vitest";

import { stripHtml } from "./utils";

describe("stripHtml", () => {
  it("returns an empty string for null, undefined and empty input", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
    expect(stripHtml("")).toBe("");
  });

  it("passes plain text through untouched", () => {
    expect(stripHtml("A novel about war and poppies.")).toBe(
      "A novel about war and poppies.",
    );
  });

  it("strips inline tags while keeping their text content", () => {
    expect(stripHtml("The <b>Dragon</b> <i>Republic</i>")).toBe(
      "The Dragon Republic",
    );
  });

  it("strips tags with attributes", () => {
    expect(stripHtml('<a href="https://example.com" rel="nofollow">Read more</a>')).toBe(
      "Read more",
    );
  });

  it("turns every <br> spelling into a single newline", () => {
    expect(stripHtml("one<br>two<br/>three<br />four<BR>five")).toBe(
      "one\ntwo\nthree\nfour\nfive",
    );
  });

  it("turns a closing </p> into a blank line between paragraphs", () => {
    expect(stripHtml("<p>First.</p><p>Second.</p>")).toBe("First.\n\nSecond.");
  });

  it("collapses three or more consecutive newlines into two", () => {
    expect(stripHtml("a<br><br><br><br>b")).toBe("a\n\nb");
  });

  it("collapses runs of <p> and <br> that would otherwise stack newlines", () => {
    expect(stripHtml("<p>First.</p>\n\n<br><p>Second.</p>")).toBe(
      "First.\n\nSecond.",
    );
  });

  it("trims leading and trailing whitespace", () => {
    expect(stripHtml("  \n <p>Body.</p> \n  ")).toBe("Body.");
  });

  it("returns an empty string when the input is markup only", () => {
    expect(stripHtml("<p></p><br/>")).toBe("");
  });

  it("decodes named entities", () => {
    expect(stripHtml("Tolkien &amp; Lewis said &quot;hello&quot;")).toBe(
      'Tolkien & Lewis said "hello"',
    );
    expect(stripHtml("it&apos;s here")).toBe("it's here");
  });

  it("decodes &nbsp; into a regular space", () => {
    expect(stripHtml("Chapter&nbsp;1")).toBe("Chapter 1");
  });

  it("decodes decimal and hexadecimal numeric entities", () => {
    expect(stripHtml("it&#39;s an &#x27;em dash&#x27; &#8212; here")).toBe(
      "it's an 'em dash' — here",
    );
  });

  it("leaves unknown and malformed entities untouched", () => {
    expect(stripHtml("R&D &fakeentity; 100&#xZZ;")).toBe("R&D &fakeentity; 100&#xZZ;");
  });

  it("does not resurrect tags hidden behind escaped entities", () => {
    expect(stripHtml("&amp;lt;script&amp;gt;")).toBe("&lt;script&gt;");
    expect(stripHtml("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe(
      "<script>alert(1)</script>",
    );
  });

  it("handles a realistic Google Books description", () => {
    const raw =
      "<p>The <b>Dragon Republic</b> is the sequel to <i>The Poppy War</i>.</p>" +
      "<p>Rin&#39;s story continues.<br>She cannot forget.</p>";

    expect(stripHtml(raw)).toBe(
      "The Dragon Republic is the sequel to The Poppy War.\n\n" +
        "Rin's story continues.\nShe cannot forget.",
    );
  });
});
