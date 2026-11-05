import { describe, expect, test } from "vitest";
import { makeStore } from "../../app/store.ts";
import { setAccent, setLanguage, setShowKeyboardHints, setTheme } from "./preferencesSlice.ts";
import { DEFAULT_PREFERENCES } from "./schema.ts";
import { selectAccent, selectLanguage, selectPreferences, selectTheme } from "./selectors.ts";
import { selectShowKeyboardHints } from "./selectShowKeyboardHints.ts";

describe("preferences defaults", () => {
  test("a fresh store starts from defaults", () => {
    const state = makeStore().getState();

    expect(selectPreferences(state)).toEqual(DEFAULT_PREFERENCES);
    expect(selectTheme(state)).toBe("system");
    expect(selectLanguage(state)).toBe("en");
    expect(selectAccent(state)).toBe("teal");
    expect(selectShowKeyboardHints(state)).toBe(true);
  });

  test("loads a stored payload", () => {
    localStorage.setItem(
      "tickd:preferences",
      JSON.stringify({
        version: 1,
        theme: "dark",
        language: "ru",
        accent: "amber",
        showKeyboardHints: false,
      }),
    );

    const state = makeStore().getState();

    expect(selectTheme(state)).toBe("dark");
    expect(selectLanguage(state)).toBe("ru");
    expect(selectAccent(state)).toBe("amber");
    expect(selectShowKeyboardHints(state)).toBe(false);
  });
});

describe("preferences actions", () => {
  test.each([
    ["theme", setTheme("dark"), "theme", "dark"],
    ["language", setLanguage("ru"), "language", "ru"],
    ["accent", setAccent("rose"), "accent", "rose"],
    ["keyboard hints", setShowKeyboardHints(false), "showKeyboardHints", false],
  ] as const)("changes the %s", (_name, action, key, value) => {
    const store = makeStore({ tasks: { items: [] } });

    store.dispatch(action);

    expect(store.getState().preferences[key]).toBe(value);
  });

  test("does not replace the state object on an unknown action", () => {
    const store = makeStore({ tasks: { items: [] } });
    const before = store.getState().preferences;

    store.dispatch({ type: "tasks/unknown" });

    expect(store.getState().preferences).toBe(before);
  });
});
