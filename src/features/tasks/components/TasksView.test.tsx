import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";
import type { Task } from "../schema.ts";

const tasks: Task[] = [
  { id: "1", title: "Active first", completed: false, createdAt: 1 },
  { id: "2", title: "Completed middle", completed: true, createdAt: 2 },
  { id: "3", title: "Active last", completed: false, createdAt: 3 },
];

describe("TasksView routes", () => {
  test("shows every task on the all route", () => {
    renderApp({ path: "/", tasks });

    expect(screen.getByRole("heading", { level: 2, name: "All tasks" })).toBeInTheDocument();
    expect(screen.getByText("Active first")).toBeInTheDocument();
    expect(screen.getByText("Completed middle")).toBeInTheDocument();
    expect(screen.getByText("Active last")).toBeInTheDocument();
  });

  test("shows only incomplete tasks on the active route", () => {
    renderApp({ path: "/active", tasks });

    expect(screen.getByRole("heading", { level: 2, name: "Active" })).toBeInTheDocument();
    expect(screen.getByText("Active first")).toBeInTheDocument();
    expect(screen.getByText("Active last")).toBeInTheDocument();
    expect(screen.queryByText("Completed middle")).not.toBeInTheDocument();
  });

  test("shows only completed tasks on the completed route", () => {
    renderApp({ path: "/completed", tasks });

    expect(screen.getByRole("heading", { level: 2, name: "Completed" })).toBeInTheDocument();
    expect(screen.getByText("Completed middle")).toBeInTheDocument();
    expect(screen.queryByText("Active first")).not.toBeInTheDocument();
    expect(screen.queryByText("Active last")).not.toBeInTheDocument();
  });

  test("accepts a trailing slash on a filter route", () => {
    const { router } = renderApp({ path: "/active/", tasks });

    expect(screen.getByRole("heading", { level: 2, name: "Active" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/active/");
  });

  test.each(["/foo", "/Active", "/active/x"])(
    "redirects unknown route %s to the root",
    async (path) => {
      const { router } = renderApp({ path, tasks });

      await waitFor(() => expect(router.state.location.pathname).toBe("/"));
      expect(screen.getByRole("heading", { level: 2, name: "All tasks" })).toBeInTheDocument();
    },
  );
});

describe("TasksView empty states", () => {
  test("shows the first-task empty state when there are no tasks", () => {
    renderApp({ tasks: [] });

    expect(screen.getByText("All caught up!")).toBeInTheDocument();
    expect(screen.getByText("Add your first task above.")).toBeInTheDocument();
  });

  test.each([
    ["/active", "No active tasks."],
    ["/completed", "No completed tasks."],
  ])("shows the no-match state on %s", (path, subtitle) => {
    const completed = path === "/active";
    renderApp({
      path,
      tasks: [{ id: "1", title: "Hidden task", completed, createdAt: 1 }],
    });

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
    expect(screen.queryByText("Hidden task")).not.toBeInTheDocument();
  });
});
