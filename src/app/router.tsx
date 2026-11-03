import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { TasksView } from "../features/tasks/components/TasksView.tsx";
import { FILTERS, filterPaths } from "../features/tasks/filter.ts";
import { App } from "./App.tsx";

const filterChildren: RouteObject[] = FILTERS.map((filter) => {
  if (filter === "all") {
    return {
      index: true,
      element: <TasksView />,
    };
  }
  return {
    path: filterPaths[filter].slice(1),
    element: <TasksView />,
    caseSensitive: true,
  };
});

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    children: [...filterChildren, { path: "*", element: <Navigate to="/" replace /> }],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });
}
