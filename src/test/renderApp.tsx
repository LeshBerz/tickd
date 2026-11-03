import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../app/router.tsx";
import { makeStore } from "../app/store.ts";
import type { Task } from "../features/tasks/schema.ts";

type RenderAppOptions = {
  path?: string;
  tasks?: Task[];
};

export function renderApp({ path = "/", tasks }: RenderAppOptions = {}) {
  const store = tasks === undefined ? makeStore() : makeStore({ tasks: { items: tasks } });
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
