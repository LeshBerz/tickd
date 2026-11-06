import {
  DEFAULT_PREFERENCES,
  migratePreferences,
  PREFERENCES_STORAGE_VERSION,
  type Preferences,
} from "./schema.ts";

export const PREFERENCES_STORAGE_KEY = "tickd:preferences";

export type SavePreferencesResult = "ok" | "unavailable";

function warnReadFailure(): void {
  if (import.meta.env.DEV) {
    console.warn("Failed to read preferences from localStorage");
  }
}

function warnWriteFailure(): void {
  if (import.meta.env.DEV) {
    console.warn("Failed to write preferences to localStorage");
  }
}

function defaults(): Preferences {
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Reads preferences without throwing: missing, malformed or unreadable data yields defaults.
 * The stored bytes are left untouched until the user changes a preference.
 */
export function loadPreferences(): Preferences {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
  } catch {
    warnReadFailure();
    return defaults();
  }

  if (raw === null) {
    return defaults();
  }

  try {
    const parsed = migratePreferences(JSON.parse(raw));
    if (parsed === null) {
      warnReadFailure();
      return defaults();
    }
    return parsed;
  } catch {
    warnReadFailure();
    return defaults();
  }
}

/** Writes preferences under their own key; failures never escape to the caller. */
export function savePreferences(preferences: Preferences): SavePreferencesResult {
  try {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: PREFERENCES_STORAGE_VERSION,
        theme: preferences.theme,
        language: preferences.language,
        accent: preferences.accent,
        showKeyboardHints: preferences.showKeyboardHints,
        guideCompleted: preferences.guideCompleted,
      }),
    );
    return "ok";
  } catch {
    warnWriteFailure();
    return "unavailable";
  }
}
