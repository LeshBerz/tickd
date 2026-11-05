/** Curated accent palettes; every pair is checked for WCAG AA contrast in tests. */
export const ACCENTS = ["teal", "blue", "violet", "amber", "rose"] as const;
export type Accent = (typeof ACCENTS)[number];

export const DEFAULT_ACCENT: Accent = "teal";

export function isAccent(value: unknown): value is Accent {
  return typeof value === "string" && (ACCENTS as readonly string[]).includes(value);
}
