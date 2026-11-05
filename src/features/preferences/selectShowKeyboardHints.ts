import type { RootState } from "../../app/store.ts";

export function selectShowKeyboardHints(_state: RootState): boolean {
  return true;
}
