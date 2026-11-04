import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/router.tsx";
import { makeStore } from "../app/store.ts";
import type { Task } from "../features/tasks/schema.ts";

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
};

export function renderApp({ path = "/", tasks, persistence }: RenderAppOptions = {}) {
  const store =
    tasks === undefined && persistence === undefined
      ? makeStore()
      : makeStore({
          ...(tasks === undefined ? {} : { tasks: { items: tasks } }),
          ...(persistence === undefined ? {} : { persistence }),
        });
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
