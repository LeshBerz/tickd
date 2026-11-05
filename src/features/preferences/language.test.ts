import { describe, expect, test } from "vitest";
import { FALLBACK_LANGUAGE, isLanguage, LANGUAGES } from "./language.ts";

describe("language", () => {
  test("supports English and Russian", () => {
    expect(LANGUAGES).toEqual(["en", "ru"]);
    expect(FALLBACK_LANGUAGE).toBe("en");
  });

  test.each([
    ["en", true],
    ["ru", true],
    ["de", false],
    ["", false],
    [undefined, false],
    [7, false],
  ])("isLanguage(%s) is %s", (value, expected) => {
    expect(isLanguage(value)).toBe(expected);
  });
});
