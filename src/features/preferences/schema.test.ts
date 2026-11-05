import { describe, expect, test } from "vitest";
import { DEFAULT_PREFERENCES, migratePreferences, PREFERENCES_STORAGE_VERSION } from "./schema.ts";

const stored = {
  version: PREFERENCES_STORAGE_VERSION,
  theme: "dark",
  language: "ru",
  accent: "violet",
  showKeyboardHints: false,
};

describe("preference defaults", () => {
  test("follow the system theme, English, teal accents, and show keyboard hints", () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      theme: "system",
      language: "en",
      accent: "teal",
      showKeyboardHints: true,
    });
  });
});

describe("migratePreferences", () => {
  test("returns a fully valid version 1 payload", () => {
    expect(migratePreferences(stored)).toEqual({
      theme: "dark",
      language: "ru",
      accent: "violet",
      showKeyboardHints: false,
    });
  });

  test.each([
    ["null", null],
    ["an array", []],
    ["a string", "{not json"],
    ["a number", 1],
    ["a missing version", { theme: "dark" }],
    ["an unknown version", { ...stored, version: 2 }],
  ])("rejects %s", (_case, raw) => {
    expect(migratePreferences(raw)).toBeNull();
  });

  test("keeps valid fields and resets only unknown ones", () => {
    expect(
      migratePreferences({
        version: 1,
        theme: "neon",
        language: "ru",
        accent: "teal",
        showKeyboardHints: "yes",
      }),
    ).toEqual({ theme: "system", language: "ru", accent: "teal", showKeyboardHints: true });
  });

  test("fills missing fields with defaults", () => {
    expect(migratePreferences({ version: 1 })).toEqual(DEFAULT_PREFERENCES);
  });

  test("ignores extra keys", () => {
    expect(migratePreferences({ ...stored, extra: "ignored" })).not.toHaveProperty("extra");
  });

  test("does not mutate the input", () => {
    const input = { ...stored };
    migratePreferences(input);

    expect(input).toEqual(stored);
  });
});
