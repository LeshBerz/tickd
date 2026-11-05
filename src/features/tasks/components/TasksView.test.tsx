import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";
import type { Task } from "../schema.ts";

const tasks: Task[] = [
  { id: "1", title: "Active first", completed: false, createdAt: 1, notes: "" },
  { id: "2", title: "Completed middle", completed: true, createdAt: 2, notes: "" },
  { id: "3", title: "Active last", completed: false, createdAt: 3, notes: "" },
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

  test("shows Press N and the coarse empty copy together when hints are on", () => {
    renderApp({ tasks: [] });

    const coarse = screen.getByText("Add your first task above.");
    expect(coarse).toHaveClass("fine-pointer:hidden");
    expect(coarse).not.toHaveClass("hidden");
    expect(coarse.querySelector("kbd")).toBeNull();

    const press = pressHint();
    expect(press).not.toBe(coarse);
    expect(press.querySelector("kbd")?.textContent).toBe("N");
    expect(chainHidesUntilFinePointer(press)).toBe(true);
  });

  test.each([
    ["/active", "No active tasks."],
    ["/completed", "No completed tasks."],
  ])("shows the no-match state on %s", (path, subtitle) => {
    const completed = path === "/active";
    renderApp({
      path,
      tasks: [{ id: "1", title: "Hidden task", completed, createdAt: 1, notes: "" }],
    });

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
    expect(screen.queryByText("Hidden task")).not.toBeInTheDocument();
  });
});

const PRESS_HINT = "Press N to add a task.";

function normalizedText(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function pressHint(): HTMLElement {
  const hosts: HTMLElement[] = [];
  for (const kbd of document.querySelectorAll("kbd")) {
    if (normalizedText(kbd) !== "N") {
      continue;
    }
    let match: HTMLElement | null = null;
    let current: Element | null = kbd;
    while (current instanceof HTMLElement) {
      if (normalizedText(current) === PRESS_HINT) {
        match = current;
        break;
      }
      current = current.parentElement;
    }
    if (match !== null && !hosts.includes(match)) {
      hosts.push(match);
    }
  }
  expect(hosts).toHaveLength(1);
  const host = hosts[0];
  if (host === undefined) {
    throw new Error("Press N hint is missing");
  }
  return host;
}

function chainHidesUntilFinePointer(host: HTMLElement): boolean {
  const kbd = host.querySelector("kbd");
  if (!(kbd instanceof HTMLElement)) {
    return false;
  }
  let current: HTMLElement | null = kbd;
  while (current !== null) {
    const tokens = (current.getAttribute("class") ?? "")
      .split(/\s+/)
      .filter((token) => token !== "");
    const shownOnFinePointer = tokens.some((token) => {
      if (token.includes("group-hover:") || token.includes("group-focus")) {
        return false;
      }
      const marker = "fine-pointer:";
      const index = token.lastIndexOf(marker);
      if (index === -1) {
        return false;
      }
      const variant = token.slice(index + marker.length);
      return variant !== "" && !variant.startsWith("hidden");
    });
    if (tokens.includes("hidden") && shownOnFinePointer) {
      return true;
    }
    if (current === host) {
      break;
    }
    current = current.parentElement;
  }
  return false;
}

function clearCompletedButton(): HTMLElement {
  const [button] = screen.getAllByRole("button", { name: "Clear completed" });
  if (button === undefined) {
    throw new Error("Clear completed button is missing");
  }
  return button;
}

describe("task footer", () => {
  test("shows the active count and Clear completed when tasks exist", () => {
    renderApp({ tasks });

    expect(screen.getAllByText("2 items left")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Clear completed" })).toHaveLength(2);
  });

  test("hides the footer when there are no tasks", () => {
    renderApp({ tasks: [] });

    expect(screen.queryByRole("button", { name: "Clear completed" })).not.toBeInTheDocument();
    expect(screen.queryByText(/items? left/)).not.toBeInTheDocument();
  });

  test("shows the empty completed filter after clearing completed tasks", async () => {
    const { user } = renderApp({ path: "/completed", tasks });

    await user.click(clearCompletedButton());

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("No completed tasks.")).toBeInTheDocument();
    expect(screen.queryByText("All caught up!")).not.toBeInTheDocument();
    expect(screen.queryByText("Completed middle")).not.toBeInTheDocument();
    expect(screen.getAllByText("2 items left")).toHaveLength(2);
  });

  test("focuses the add input after clearing the completed filter", async () => {
    const { user } = renderApp({ path: "/completed", tasks });

    await user.click(clearCompletedButton());

    await waitFor(() => expect(document.getElementById("tickd-add-task")).toHaveFocus());
    expect(document.getElementById("tickd-add-task")).toBe(
      screen.getByRole("textbox", { name: "Add a task" }),
    );
  });
});
