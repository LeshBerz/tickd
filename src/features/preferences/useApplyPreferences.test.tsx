import { renderHook } from "@testing-library/react";
import { act } from "react";
import { Provider } from "react-redux";
import { describe, expect, test } from "vitest";
import { makeStore, type StorePreload } from "../../app/store.ts";
import { setAccent, setLanguage, setTheme } from "./preferencesSlice.ts";
import { useApplyPreferences } from "./useApplyPreferences.ts";

type MediaListener = (event: MediaQueryListEvent) => void;

type MediaController = {
  listeners: Set<MediaListener>;
  query: MediaQueryList;
  emit: (next: boolean) => void;
  restore: () => void;
};

function installMatchMedia(matches: boolean): MediaController {
  const listeners = new Set<MediaListener>();
  const query = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: string, listener: MediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      listeners.delete(listener);
    },
  };
  window.matchMedia = ((_query: string) =>
    query as unknown as MediaQueryList) as typeof window.matchMedia;

  return {
    listeners,
    query: query as unknown as MediaQueryList,
    emit(next) {
      Object.defineProperty(query, "matches", { value: next, configurable: true });
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
    restore() {
      Reflect.deleteProperty(window, "matchMedia");
    },
  };
}

function renderWithPreferences(preload: StorePreload) {
  const store = makeStore(preload);
  const view = renderHook(() => useApplyPreferences(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  return { ...view, store };
}

describe("useApplyPreferences", () => {
  test("applies the dark class and accent attribute from the store", () => {
    const { store } = renderWithPreferences({
      tasks: { items: [] },
      preferences: { theme: "dark" },
    });

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-accent", "teal");

    act(() => {
      store.dispatch(setAccent("amber"));
    });

    expect(document.documentElement).toHaveAttribute("data-accent", "amber");
  });

  test("mirrors the language on the html element", () => {
    const { store } = renderWithPreferences({
      tasks: { items: [] },
      preferences: { language: "ru" },
    });

    expect(document.documentElement.lang).toBe("ru");

    act(() => {
      store.dispatch(setLanguage("en"));
    });

    expect(document.documentElement.lang).toBe("en");
  });

  test("follows the OS theme while the mode is system", () => {
    const media = installMatchMedia(true);
    try {
      const { store } = renderWithPreferences({
        tasks: { items: [] },
        preferences: { theme: "system" },
      });
      expect(document.documentElement).toHaveClass("dark");

      act(() => {
        media.emit(false);
      });

      expect(document.documentElement).not.toHaveClass("dark");

      act(() => {
        store.dispatch(setTheme("dark"));
      });
      expect(document.documentElement).toHaveClass("dark");

      act(() => {
        media.emit(true);
      });
      expect(document.documentElement).toHaveClass("dark");
    } finally {
      media.restore();
    }
  });

  test("stops following the OS theme after an explicit light choice", () => {
    const media = installMatchMedia(true);
    try {
      const { store } = renderWithPreferences({
        tasks: { items: [] },
        preferences: { theme: "system" },
      });

      act(() => {
        store.dispatch(setTheme("light"));
      });
      expect(document.documentElement).not.toHaveClass("dark");

      act(() => {
        media.emit(true);
      });
      expect(document.documentElement).not.toHaveClass("dark");
    } finally {
      media.restore();
    }
  });

  test("unsubscribes from the media query on unmount", () => {
    const media = installMatchMedia(false);
    try {
      const { unmount } = renderWithPreferences({
        tasks: { items: [] },
        preferences: { theme: "system" },
      });
      expect(media.listeners.size).toBe(1);

      unmount();

      expect(media.listeners.size).toBe(0);
    } finally {
      media.restore();
    }
  });

  test("renders without a matchMedia implementation", () => {
    Reflect.deleteProperty(window, "matchMedia");

    renderWithPreferences({ tasks: { items: [] }, preferences: { theme: "system" } });

    expect(document.documentElement).not.toHaveClass("dark");
  });
});
