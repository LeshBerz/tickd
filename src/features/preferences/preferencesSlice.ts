import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Language } from "./language.ts";
import type { Accent } from "./palettes.ts";
import { DEFAULT_PREFERENCES, type Preferences } from "./schema.ts";
import type { ThemeMode } from "./theme.ts";

export type PreferencesState = Preferences;

export const initialState: PreferencesState = { ...DEFAULT_PREFERENCES };

export const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload;
    },
    setAccent(state, action: PayloadAction<Accent>) {
      state.accent = action.payload;
    },
    setShowKeyboardHints(state, action: PayloadAction<boolean>) {
      state.showKeyboardHints = action.payload;
    },
    /** Finishing or skipping the tour both count as "seen"; other preferences stay untouched. */
    completeGuide(state) {
      if (state.guideCompleted) {
        return;
      }
      state.guideCompleted = true;
    },
  },
});

export const { setTheme, setLanguage, setAccent, setShowKeyboardHints, completeGuide } =
  preferencesSlice.actions;
