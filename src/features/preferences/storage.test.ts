import { afterEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_PREFERENCES, PREFERENCES_STORAGE_VERSION } from "./schema.ts";
import { loadPreferences, PREFERENCES_STORAGE_KEY, savePreferences } from "./storage.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadPreferences", () => {
  test("returns defaults when nothing is stored", () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();
  });

  test("reads a valid payload", () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        theme: "dark",
        language: "ru",
        accent: "rose",
        showKeyboardHints: false,
        guideCompleted: true,
      }),
    );

    expect(loadPreferences()).toEqual({
      theme: "dark",
      language: "ru",
      accent: "rose",
      showKeyboardHints: false,
      guideCompleted: true,
    });
  });

  test("keeps every version 1 preference and restarts the tour", () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        theme: "dark",
        language: "ru",
        accent: "rose",
        showKeyboardHints: false,
      }),
    );

    expect(loadPreferences()).toEqual({
      theme: "dark",
      language: "ru",
      accent: "rose",
      showKeyboardHints: false,
      guideCompleted: false,
    });
  });

  test("falls back to defaults on invalid JSON without erasing the bytes", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(PREFERENCES_STORAGE_KEY, "{not json");

    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBe("{not json");
  });

  test("falls back to defaults on an unknown version", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: 99, theme: "dark", language: "ru" }),
    );

    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("falls back to defaults when storage throws on read", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  test("does not read or write the tasks key", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    loadPreferences();

    expect(getItem).toHaveBeenCalledWith(PREFERENCES_STORAGE_KEY);
    expect(getItem).not.toHaveBeenCalledWith("tickd:tasks");
  });
});

describe("savePreferences", () => {
  test("writes a versioned payload under its own key", () => {
    const result = savePreferences({
      theme: "light",
      language: "ru",
      accent: "amber",
      showKeyboardHints: false,
      guideCompleted: true,
    });

    expect(result).toBe("ok");
    expect(PREFERENCES_STORAGE_VERSION).toBe(2);
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({
        version: 2,
        theme: "light",
        language: "ru",
        accent: "amber",
        showKeyboardHints: false,
        guideCompleted: true,
      }),
    );
    expect(localStorage.getItem("tickd:tasks")).toBeNull();
  });

  test("returns unavailable without throwing when storage rejects the write", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(savePreferences(DEFAULT_PREFERENCES)).toBe("unavailable");
  });

  test("round-trips through loadPreferences", () => {
    const preferences = {
      theme: "dark" as const,
      language: "ru" as const,
      accent: "blue" as const,
      showKeyboardHints: false,
      guideCompleted: true,
    };
    savePreferences(preferences);

    expect(loadPreferences()).toEqual(preferences);
  });
});
