import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/router.tsx";
import { makeStore } from "../app/store.ts";
import type { Preferences } from "../features/preferences/schema.ts";
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
};

export function renderApp({ path = "/", tasks, persistence, preferences }: RenderAppOptions = {}) {
  const hasPreload = tasks !== undefined || persistence !== undefined || preferences !== undefined;
  const store = hasPreload
    ? makeStore({
        ...(tasks === undefined ? {} : { tasks: { items: tasks } }),
        ...(persistence === undefined ? {} : { persistence }),
        ...(preferences === undefined ? {} : { preferences }),
      })
    : makeStore();
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
