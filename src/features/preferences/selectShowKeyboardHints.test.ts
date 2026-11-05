import { expect, test } from "vitest";
import { makeStore } from "../../app/store.ts";
import { selectShowKeyboardHints } from "./selectShowKeyboardHints.ts";

test("returns true while no preferences flag is stored", () => {
  expect(selectShowKeyboardHints(makeStore().getState())).toBe(true);
});
