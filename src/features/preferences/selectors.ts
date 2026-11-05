import type { RootState } from "../../app/store.ts";
import { FALLBACK_LANGUAGE, type Language } from "./language.ts";
import type { Accent } from "./palettes.ts";
import type { Preferences } from "./schema.ts";
import type { ThemeMode } from "./theme.ts";

type PreferencesSelectorState = Pick<RootState, "preferences">;

export const selectPreferences = (state: PreferencesSelectorState): Preferences =>
  state.preferences;

export const selectTheme = (state: PreferencesSelectorState): ThemeMode => state.preferences.theme;

export const selectAccent = (state: PreferencesSelectorState): Accent => state.preferences.accent;

export const selectLanguage = (state: PreferencesSelectorState): Language =>
  state.preferences.language ?? FALLBACK_LANGUAGE;
