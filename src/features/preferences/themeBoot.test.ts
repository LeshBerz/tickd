/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { LANGUAGES } from "./language.ts";
import { ACCENTS } from "./palettes.ts";
import { THEMES } from "./theme.ts";

const BOOT_SCRIPT = readFileSync(resolve(process.cwd(), "public", "theme-boot.js"), "utf8");

type BootEnvironment = {
  classList: string[];
  attributes: Record<string, string>;
  storage: string | null;
  prefersDark: boolean;
  storageThrows?: boolean;
};

function runBoot({ classList, attributes, storage, prefersDark, storageThrows }: BootEnvironment) {
  const root = {
    classList: {
      add: (name: string) => classList.push(name),
    },
    setAttribute: (name: string, value: string) => {
      attributes[name] = value;
    },
  };
  const sandboxWindow = {
    localStorage: {
      getItem: () => {
        if (storageThrows === true) {
          throw new Error("blocked");
        }
        return storage;
      },
    },
    matchMedia: (query: string) => ({ matches: query.includes("dark") && prefersDark }),
  };

  new Function("window", "document", BOOT_SCRIPT)(sandboxWindow, {
    documentElement: root,
  });

  return { classList, attributes };
}

function stored(payload: unknown): string {
  return JSON.stringify(payload);
}

describe("theme boot script", () => {
  test("applies a stored dark theme before the app renders", () => {
    const { classList, attributes } = runBoot({
      classList: [],
      attributes: {},
      storage: stored({ version: 1, theme: "dark", accent: "rose" }),
      prefersDark: false,
    });

    expect(classList).toContain("dark");
    expect(attributes["data-accent"]).toBe("rose");
  });

  test("never applies dark for an explicit light theme, even with a dark OS preference", () => {
    const { classList } = runBoot({
      classList: [],
      attributes: {},
      storage: stored({ version: 1, theme: "light", accent: "teal" }),
      prefersDark: true,
    });

    expect(classList).not.toContain("dark");
  });

  test("follows the OS preference in system mode", () => {
    const dark = runBoot({
      classList: [],
      attributes: {},
      storage: stored({ version: 1, theme: "system" }),
      prefersDark: true,
    });
    expect(dark.classList).toContain("dark");

    const light = runBoot({
      classList: [],
      attributes: {},
      storage: stored({ version: 1, theme: "system" }),
      prefersDark: false,
    });
    expect(light.classList).not.toContain("dark");
  });

  test("uses the OS preference when nothing is stored", () => {
    const { classList, attributes } = runBoot({
      classList: [],
      attributes: {},
      storage: null,
      prefersDark: true,
    });

    expect(classList).toContain("dark");
    expect(attributes["data-accent"]).toBe("teal");
  });

  test("applies the stored language to the document before the app renders", () => {
    const russian = runBoot({
      classList: [],
      attributes: {},
      storage: stored({ version: 1, language: "ru" }),
      prefersDark: false,
    });
    expect(russian.attributes.lang).toBe("ru");

    const english = runBoot({
      classList: [],
      attributes: {},
      storage: stored({ version: 1, language: "en" }),
      prefersDark: false,
    });
    expect(english.attributes.lang).toBe("en");
  });

  test("leaves the document language alone when it is missing or unsupported", () => {
    for (const payload of [
      stored({ version: 1, theme: "dark" }),
      stored({ version: 1, language: "de" }),
    ]) {
      const { attributes } = runBoot({
        classList: [],
        attributes: {},
        storage: payload,
        prefersDark: false,
      });
      expect(attributes.lang).toBeUndefined();
    }
  });

  test.each([
    ["invalid JSON", "{not json"],
    ["an unknown version", stored({ version: 9, theme: "dark" })],
    ["an unknown theme", stored({ version: 1, theme: "neon" })],
    ["an unknown accent", stored({ version: 1, accent: "plaid" })],
    ["a non-object payload", stored(["dark"])],
  ])("survives %s", (_case, storage) => {
    const { classList, attributes } = runBoot({
      classList: [],
      attributes: {},
      storage,
      prefersDark: false,
    });

    expect(classList).not.toContain("dark");
    expect(attributes["data-accent"]).toBe("teal");
  });

  test("survives a throwing storage", () => {
    const { classList, attributes } = runBoot({
      classList: [],
      attributes: {},
      storage: null,
      prefersDark: false,
      storageThrows: true,
    });

    expect(classList).not.toContain("dark");
    expect(attributes["data-theme"]).toBeUndefined();
  });

  test("survives a missing matchMedia", () => {
    const root = {
      classList: { add: vi.fn() },
      setAttribute: vi.fn(),
    };

    expect(() => {
      new Function("window", "document", BOOT_SCRIPT)(
        { localStorage: { getItem: () => null } },
        { documentElement: root },
      );
    }).not.toThrow();
    expect(root.setAttribute).toHaveBeenCalledWith("data-accent", "teal");
  });

  test("contains no inline handlers or eval", () => {
    expect(BOOT_SCRIPT).not.toMatch(/\beval\s*\(/);
    expect(BOOT_SCRIPT).not.toMatch(/innerHTML/);
    expect(BOOT_SCRIPT).not.toMatch(/document\.write/);
  });

  test("accepts exactly the values the app itself supports", () => {
    const allowedList = (name: string): string[] => {
      const match = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(BOOT_SCRIPT);
      if (match?.[1] === undefined) {
        throw new Error(`${name} is missing from the boot script`);
      }
      return match[1]
        .split(",")
        .map((entry) => entry.trim().replace(/^"|"$/g, ""))
        .filter((entry) => entry !== "");
    };

    expect(allowedList("THEMES")).toEqual([...THEMES]);
    expect(allowedList("ACCENTS")).toEqual([...ACCENTS]);
    expect(allowedList("LANGUAGES")).toEqual([...LANGUAGES]);
  });
});
