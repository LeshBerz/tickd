import * as v from "valibot";
import { FALLBACK_LANGUAGE, LANGUAGES, type Language } from "./language.ts";
import { ACCENTS, type Accent, DEFAULT_ACCENT } from "./palettes.ts";
import { DEFAULT_THEME, THEMES, type ThemeMode } from "./theme.ts";

export const PREFERENCES_STORAGE_VERSION = 2;
export const LEGACY_PREFERENCES_STORAGE_VERSION = 1;

export type Preferences = {
  theme: ThemeMode;
  language: Language;
  accent: Accent;
  showKeyboardHints: boolean;
  /** The tour is "seen" once the user finishes or skips it. */
  guideCompleted: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: DEFAULT_THEME,
  language: FALLBACK_LANGUAGE,
  accent: DEFAULT_ACCENT,
  showKeyboardHints: true,
  guideCompleted: false,
};

export const PreferencesV1Schema = v.object({
  version: v.literal(LEGACY_PREFERENCES_STORAGE_VERSION),
  theme: v.picklist(THEMES),
  language: v.picklist(LANGUAGES),
  accent: v.picklist(ACCENTS),
  showKeyboardHints: v.boolean(),
});

export const PreferencesV2Schema = v.object({
  version: v.literal(PREFERENCES_STORAGE_VERSION),
  theme: v.picklist(THEMES),
  language: v.picklist(LANGUAGES),
  accent: v.picklist(ACCENTS),
  showKeyboardHints: v.boolean(),
  guideCompleted: v.boolean(),
});

export type StoredPreferencesV1 = v.InferOutput<typeof PreferencesV1Schema>;
export type StoredPreferencesV2 = v.InferOutput<typeof PreferencesV2Schema>;

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  return raw as Record<string, unknown>;
}

function pick<T>(schema: v.GenericSchema<unknown, T>, value: unknown, fallback: T): T {
  const result = v.safeParse(schema, value);
  return result.success ? result.output : fallback;
}

const ThemeSchema = v.picklist(THEMES);
const LanguageSchema = v.picklist(LANGUAGES);
const AccentSchema = v.picklist(ACCENTS);

/**
 * Any supported payload → preferences. Unknown versions and non-objects are rejected,
 * while individual fields fall back to defaults so one stale value cannot reset the rest.
 * Version 1 payloads keep every stored value and simply start the tour again.
 */
export function migratePreferences(raw: unknown): Preferences | null {
  const record = asRecord(raw);
  if (record === null) {
    return null;
  }

  const version = record.version;
  if (version !== PREFERENCES_STORAGE_VERSION && version !== LEGACY_PREFERENCES_STORAGE_VERSION) {
    return null;
  }

  const strict = v.safeParse(PreferencesV2Schema, record);
  if (strict.success) {
    return {
      theme: strict.output.theme,
      language: strict.output.language,
      accent: strict.output.accent,
      showKeyboardHints: strict.output.showKeyboardHints,
      guideCompleted: strict.output.guideCompleted,
    };
  }

  const legacy = v.safeParse(PreferencesV1Schema, record);
  if (legacy.success) {
    return {
      theme: legacy.output.theme,
      language: legacy.output.language,
      accent: legacy.output.accent,
      showKeyboardHints: legacy.output.showKeyboardHints,
      guideCompleted: false,
    };
  }

  return {
    theme: pick(ThemeSchema, record.theme, DEFAULT_PREFERENCES.theme),
    language: pick(LanguageSchema, record.language, DEFAULT_PREFERENCES.language),
    accent: pick(AccentSchema, record.accent, DEFAULT_PREFERENCES.accent),
    showKeyboardHints: pick(
      v.boolean(),
      record.showKeyboardHints,
      DEFAULT_PREFERENCES.showKeyboardHints,
    ),
    guideCompleted: pick(v.boolean(), record.guideCompleted, DEFAULT_PREFERENCES.guideCompleted),
  };
}
