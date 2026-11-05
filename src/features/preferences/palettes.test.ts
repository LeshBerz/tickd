/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { ACCENTS } from "./palettes.ts";

// The real token values are read from the stylesheet: a palette cannot be approved
// by eye while the measured ratios stay unchecked.
const CSS_PATH = resolve(process.cwd(), "src", "index.css");
const css = readFileSync(CSS_PATH, "utf8");

/**
 * Repeatable contrast verification: the test reads the real CSS token values,
 * so a palette cannot be "fixed" visually while its measured ratio stays unknown.
 */

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb {
  const value = hex.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Expected a 6-digit hex color, got "${hex}"`);
  }
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two opaque colors. */
function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(parseHex(a));
  const second = relativeLuminance(parseHex(b));
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css);
  if (match === null || match[1] === undefined) {
    throw new Error(`CSS block "${selector}" is missing`);
  }
  const tokens: Record<string, string> = {};
  for (const line of match[1].split(";")) {
    const [name, value] = line.split(":");
    if (name === undefined || value === undefined) {
      continue;
    }
    const key = name.trim();
    if (key !== "" && key.startsWith("--")) {
      tokens[key] = value.trim();
    }
  }
  return tokens;
}

function token(tokens: Record<string, string>, name: string): string {
  const value = tokens[name];
  if (value === undefined) {
    throw new Error(`Token ${name} is missing`);
  }
  return value;
}

const lightBase = block(":root");
const darkBase = block(".dark");

function paletteFor(accent: string, theme: "light" | "dark"): Record<string, string> {
  const selector =
    theme === "light" ? `[data-accent="${accent}"]` : `.dark[data-accent="${accent}"]`;
  return { ...(theme === "light" ? lightBase : darkBase), ...block(selector) };
}

const AA_TEXT = 4.5;
const AA_LARGE_AND_UI = 3;

describe("WCAG AA contrast of surfaces and text", () => {
  test.each([
    ["light", lightBase],
    ["dark", darkBase],
  ])("body text, muted text and danger text stay readable in %s", (_theme, tokens) => {
    for (const background of ["--theme-bg", "--theme-surface", "--theme-card"]) {
      expect(
        contrastRatio(token(tokens, "--theme-text"), token(tokens, background)),
      ).toBeGreaterThanOrEqual(AA_TEXT);
      expect(
        contrastRatio(token(tokens, "--theme-text-muted"), token(tokens, background)),
      ).toBeGreaterThanOrEqual(AA_TEXT);
      expect(
        contrastRatio(token(tokens, "--theme-danger"), token(tokens, background)),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  test.each([
    ["light", lightBase],
    ["dark", darkBase],
  ])("UI borders and card borders are distinguishable in %s", (_theme, tokens) => {
    for (const background of ["--theme-bg", "--theme-surface", "--theme-card"]) {
      expect(
        contrastRatio(token(tokens, "--theme-border-ui"), token(tokens, background)),
      ).toBeGreaterThanOrEqual(AA_LARGE_AND_UI);
    }
  });
});

describe("every accent palette meets AA in both themes", () => {
  for (const accent of ACCENTS) {
    test.each([["light"], ["dark"]] as const)(`${accent} palette in %s`, (theme) => {
      const tokens = paletteFor(accent, theme);
      const accentColor = token(tokens, "--theme-accent");
      const accentText = token(tokens, "--theme-accent-text");
      const ring = token(tokens, "--theme-ring");

      // Normal-size text on the accent button and accent-colored labels/icons.
      expect(contrastRatio(accentText, accentColor)).toBeGreaterThanOrEqual(AA_TEXT);

      for (const background of [
        "--theme-bg",
        "--theme-surface",
        "--theme-card",
        "--theme-card-hover",
        "--theme-sidebar",
      ]) {
        expect(contrastRatio(accentColor, token(tokens, background))).toBeGreaterThanOrEqual(
          AA_TEXT,
        );
      }

      // Focus rings are UI indicators: 3:1 against adjacent surfaces.
      for (const background of ["--theme-bg", "--theme-surface", "--theme-card"]) {
        expect(contrastRatio(ring, token(tokens, background))).toBeGreaterThanOrEqual(
          AA_LARGE_AND_UI,
        );
      }

      // Every accent must stay distinct from plain text, otherwise the highlight disappears.
      expect(contrastRatio(accentColor, token(tokens, "--theme-text"))).toBeGreaterThan(1);
    });
  }

  test("light and dark accents are visually different for the same palette", () => {
    for (const accent of ACCENTS) {
      expect(token(paletteFor(accent, "light"), "--theme-accent")).not.toBe(
        token(paletteFor(accent, "dark"), "--theme-accent"),
      );
    }
  });
});

describe("contrast helper", () => {
  test("matches known WCAG reference ratios", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
  });
});
