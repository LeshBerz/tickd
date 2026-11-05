import type { RootState } from "../../app/store.ts";

/** Keyboard hints are a real preference since stage 12; they default to on. */
export function selectShowKeyboardHints(state: RootState): boolean {
  return state.preferences.showKeyboardHints;
}
