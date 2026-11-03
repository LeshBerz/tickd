import { describe, expect, test } from "vitest";
import { clampTitleLength, normalizePastedTitle, TITLE_MAX_LENGTH } from "./title.ts";

test("TITLE_MAX_LENGTH is 200 UTF-16 code units", () => {
  expect(TITLE_MAX_LENGTH).toBe(200);
});

describe("normalizePastedTitle", () => {
  test.each([
    ["an LF newline", "a\nb", "a b"],
    ["a CRLF newline", "a\r\nb", "a b"],
    ["a CR newline", "a\rb", "a b"],
    ["a blank line", "a\n\nb", "a b"],
    ["CRLF followed by LF", "a\r\n\nb", "a b"],
    ["spaces and tabs", "a \t  b", "a b"],
  ])("collapses %s to a single space", (_label, pasted, expected) => {
    expect(normalizePastedTitle(pasted)).toBe(expected);
  });

  test("collapses a run of unicode spaces to one space", () => {
    expect(normalizePastedTitle("a\u00a0\u2003b")).toBe("a b");
  });

  test("keeps a single leading and trailing space", () => {
    expect(normalizePastedTitle(" a ")).toBe(" a ");
  });

  test("collapses repeated end spaces without stripping the remaining space", () => {
    expect(normalizePastedTitle("  a  ")).toBe(" a ");
  });

  test("leaves a title without extra whitespace unchanged", () => {
    expect(normalizePastedTitle("hello")).toBe("hello");
  });

  test("keeps emoji and right-to-left text while collapsing newlines", () => {
    expect(normalizePastedTitle("👋\nמשימה\nمهمة")).toBe("👋 משימה مهمة");
  });
});

describe("clampTitleLength", () => {
  test("leaves a short title unchanged", () => {
    expect(clampTitleLength("hello")).toBe("hello");
  });

  test("leaves a title of exactly 200 code units unchanged", () => {
    const title = "a".repeat(TITLE_MAX_LENGTH);

    expect(clampTitleLength(title)).toBe(title);
  });

  test("truncates a title longer than 200 code units", () => {
    expect(clampTitleLength("a".repeat(TITLE_MAX_LENGTH + 1))).toBe("a".repeat(TITLE_MAX_LENGTH));
  });

  test("truncates without trimming", () => {
    const value = ` ${"a".repeat(TITLE_MAX_LENGTH)}`;

    expect(clampTitleLength(value)).toBe(value.slice(0, TITLE_MAX_LENGTH));
  });

  test("counts a single emoji as two code units when clamping", () => {
    expect("👋").toHaveLength(2);

    const fitted = "👋".repeat(100);
    expect(fitted).toHaveLength(TITLE_MAX_LENGTH);
    expect(clampTitleLength(fitted)).toBe(fitted);

    const over = `${fitted}x`;
    expect(over).toHaveLength(TITLE_MAX_LENGTH + 1);
    expect(clampTitleLength(over)).toBe(fitted);
  });

  test("truncates at 200 code units even when that splits an emoji", () => {
    const value = `${"a".repeat(TITLE_MAX_LENGTH - 1)}👋`;

    expect(value).toHaveLength(TITLE_MAX_LENGTH + 1);
    expect(clampTitleLength(value)).toBe(value.slice(0, TITLE_MAX_LENGTH));
    expect(clampTitleLength(value)).toHaveLength(TITLE_MAX_LENGTH);
  });
});
