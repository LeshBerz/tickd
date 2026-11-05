import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { TasksLayout } from "../features/tasks/components/TasksLayout.tsx";
import { TasksView } from "../features/tasks/components/TasksView.tsx";
import { FILTERS, filterPaths } from "../features/tasks/filter.ts";
import { App } from "./App.tsx";

const DETAIL_ROUTE = "tasks/:id";

function listAndDetailRoutes(): RouteObject[] {
  return [
    { index: true, element: <TasksView /> },
    { path: DETAIL_ROUTE, element: <TasksView /> },
  ];
}

const filterChildren: RouteObject[] = FILTERS.flatMap((filter): RouteObject[] => {
  if (filter === "all") {
    return listAndDetailRoutes();
  }
  return [
    {
      path: filterPaths[filter].slice(1),
      caseSensitive: true,
      children: listAndDetailRoutes(),
    },
  ];
});

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    children: [
      { element: <TasksLayout />, children: filterChildren },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });
}
