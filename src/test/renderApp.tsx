import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/router.tsx";
import { makeStore } from "../app/store.ts";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_VERSION,
  type Preferences,
} from "../features/preferences/schema.ts";
import { PREFERENCES_STORAGE_KEY } from "../features/preferences/storage.ts";
import type { Task } from "../features/tasks/schema.ts";
import { applyLanguage } from "../i18n/index.ts";

export type PersistencePreload = {
  available: boolean;
  loadDiscarded: boolean;
  saveError: "quota" | "unavailable" | null;
  availabilityDismissed: boolean;
};

type RenderAppOptions = {
  path?: string;
  tasks?: Task[];
  persistence?: PersistencePreload;
  preferences?: Partial<Preferences>;
  /** The first-visit tour is off by default so unrelated tests see the plain UI. */
  guideCompleted?: boolean;
};

export function renderApp({
  path = "/",
  tasks,
  persistence,
  preferences,
  guideCompleted = true,
}: RenderAppOptions = {}) {
  // Seed the preferences key so a store built without preload reads the same values,
  // and so unrelated tests never get the first-visit tour. A blocked storage keeps
  // its existing behaviour: the app falls back to defaults on its own.
  try {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        version: PREFERENCES_STORAGE_VERSION,
        ...DEFAULT_PREFERENCES,
        ...preferences,
        guideCompleted,
      }),
    );
  } catch {
    // Storage is intentionally unavailable in some tests.
  }

  const hasPreload = tasks !== undefined || persistence !== undefined || preferences !== undefined;
  const store = makeStore(
    hasPreload
      ? {
          ...(tasks === undefined ? {} : { tasks: { items: tasks } }),
          ...(persistence === undefined ? {} : { persistence }),
          preferences: { ...preferences, guideCompleted },
        }
      : undefined,
  );
  // Tests assert English copy unless they switch the language explicitly.
  applyLanguage(store.getState().preferences.language);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(
    <StrictMode>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </StrictMode>,
  );

  return { ...view, store, router, user };
}
