import { describe, expect, test } from "vitest";
import { DEFAULT_PREFERENCES, migratePreferences, PREFERENCES_STORAGE_VERSION } from "./schema.ts";

const storedV2 = {
  version: 2,
  theme: "dark",
  language: "ru",
  accent: "violet",
  showKeyboardHints: false,
  guideCompleted: true,
};

const storedV1 = {
  version: 1,
  theme: "dark",
  language: "ru",
  accent: "violet",
  showKeyboardHints: false,
};

describe("preference defaults", () => {
  test("follow the system theme, English, teal accents, hints on and no tour yet", () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      theme: "system",
      language: "en",
      accent: "teal",
      showKeyboardHints: true,
      guideCompleted: false,
    });
  });

  test("store the current schema version", () => {
    expect(PREFERENCES_STORAGE_VERSION).toBe(2);
  });
});

describe("migratePreferences", () => {
  test("returns a fully valid version 2 payload", () => {
    expect(migratePreferences(storedV2)).toEqual({
      theme: "dark",
      language: "ru",
      accent: "violet",
      showKeyboardHints: false,
      guideCompleted: true,
    });
  });

  test("migrates version 1, keeping every stored preference", () => {
    expect(migratePreferences(storedV1)).toEqual({
      theme: "dark",
      language: "ru",
      accent: "violet",
      showKeyboardHints: false,
      guideCompleted: false,
    });
  });

  test("a version 1 payload cannot claim the tour was completed", () => {
    expect(migratePreferences({ ...storedV1, guideCompleted: true })).toMatchObject({
      guideCompleted: false,
    });
  });

  test.each([
    ["null", null],
    ["an array", []],
    ["a string", "{not json"],
    ["a number", 1],
    ["a missing version", { theme: "dark" }],
    ["an unknown version", { ...storedV2, version: 3 }],
  ])("rejects %s", (_case, raw) => {
    expect(migratePreferences(raw)).toBeNull();
  });

  test("keeps valid fields and resets only unknown ones", () => {
    expect(
      migratePreferences({
        version: 2,
        theme: "neon",
        language: "ru",
        accent: "teal",
        showKeyboardHints: "yes",
        guideCompleted: null,
      }),
    ).toEqual({
      theme: "system",
      language: "ru",
      accent: "teal",
      showKeyboardHints: true,
      guideCompleted: false,
    });
  });

  test("fills missing fields with defaults", () => {
    expect(migratePreferences({ version: 2 })).toEqual(DEFAULT_PREFERENCES);
  });

  test("ignores extra keys", () => {
    expect(migratePreferences({ ...storedV2, extra: "ignored" })).not.toHaveProperty("extra");
  });

  test("does not mutate the input", () => {
    const input = { ...storedV2 };
    migratePreferences(input);

    expect(input).toEqual(storedV2);
  });
});
