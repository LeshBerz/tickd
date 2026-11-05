export const LANGUAGES = ["en", "ru"] as const;
export type Language = (typeof LANGUAGES)[number];

/** English is the product default and the missing-key fallback. */
export const FALLBACK_LANGUAGE: Language = "en";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}
