import { expect, test } from "vitest";
import { makeStore } from "../../app/store.ts";
import { setShowKeyboardHints } from "./preferencesSlice.ts";
import { selectShowKeyboardHints } from "./selectShowKeyboardHints.ts";

test("returns true by default", () => {
  expect(selectShowKeyboardHints(makeStore().getState())).toBe(true);
});

test("follows the stored flag", () => {
  const enabled = makeStore({
    tasks: { items: [] },
    preferences: { showKeyboardHints: false },
  });
  expect(selectShowKeyboardHints(enabled.getState())).toBe(false);

  enabled.dispatch(setShowKeyboardHints(true));

  expect(selectShowKeyboardHints(enabled.getState())).toBe(true);
});
