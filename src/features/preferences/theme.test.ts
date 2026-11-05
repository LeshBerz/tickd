import { describe, expect, test } from "vitest";
import {
  DARK_MEDIA_QUERY,
  darkMediaQuery,
  isThemeMode,
  resolveTheme,
  systemPrefersDark,
} from "./theme.ts";

describe("resolveTheme", () => {
  test.each([
    ["system", true, "dark"],
    ["system", false, "light"],
    ["light", true, "light"],
    ["light", false, "light"],
    ["dark", true, "dark"],
    ["dark", false, "dark"],
  ] as const)("%s with prefers-dark=%s resolves to %s", (mode, prefersDark, expected) => {
    expect(resolveTheme(mode, prefersDark)).toBe(expected);
  });
});

describe("isThemeMode", () => {
  test.each([
    ["system", true],
    ["light", true],
    ["dark", true],
    ["Dark", false],
    ["", false],
    [null, false],
    [1, false],
  ])("isThemeMode(%s) is %s", (value, expected) => {
    expect(isThemeMode(value)).toBe(expected);
  });
});

describe("system preference helpers", () => {
  test("return false / null when matchMedia is unavailable", () => {
    const original = window.matchMedia;
    // jsdom has no matchMedia; removing it must not throw.
    Reflect.deleteProperty(window, "matchMedia");
    try {
      expect(systemPrefersDark()).toBe(false);
      expect(darkMediaQuery()).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  test("read the dark-mode media query", () => {
    const listener = { matches: true, addEventListener: () => {}, removeEventListener: () => {} };
    window.matchMedia = ((query: string) => {
      expect(query).toBe(DARK_MEDIA_QUERY);
      return listener as unknown as MediaQueryList;
    }) as typeof window.matchMedia;

    expect(systemPrefersDark()).toBe(true);
    expect(darkMediaQuery()).not.toBeNull();
  });

  test("treat a throwing matchMedia as no preference", () => {
    window.matchMedia = (() => {
      throw new Error("blocked");
    }) as typeof window.matchMedia;

    expect(systemPrefersDark()).toBe(false);
    expect(darkMediaQuery()).toBeNull();
  });
});
