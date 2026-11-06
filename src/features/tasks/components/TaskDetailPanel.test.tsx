import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";
import type { Task } from "../schema.ts";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    completed: false,
    createdAt: Number(id),
    notes: "",
    ...overrides,
  };
}

type AppUser = ReturnType<typeof renderApp>["user"];

function panel(): HTMLElement {
  const aside = within(screen.getByRole("main")).queryByRole("complementary");
  if (aside === null) {
    throw new Error("detail panel is missing");
  }
  return aside;
}

function queryPanel(): HTMLElement | null {
  return within(screen.getByRole("main")).queryByRole("complementary");
}

function notesField(): HTMLElement {
  return within(panel()).getByRole("textbox", { name: "Notes" });
}

async function clickTitle(user: AppUser, title: string): Promise<void> {
  await user.click(screen.getByRole("button", { name: title }));
}

describe("opening the detail panel from the list", () => {
  test("navigates to the detail route when the title is clicked once", async () => {
    const { router, user } = renderApp({ tasks: [task("1")] });

    await clickTitle(user, "Task 1");

    await waitFor(() => expect(router.state.location.pathname).toBe("/tasks/1"));
    expect(await screen.findByRole("heading", { level: 2, name: "Task 1" })).toBeInTheDocument();
    expect(queryPanel()).not.toBeNull();
  });

  test("keeps the filter segment in the detail route", async () => {
    const { router, user } = renderApp({
      path: "/active",
      tasks: [task("1")],
    });

    await clickTitle(user, "Task 1");

    await waitFor(() => expect(router.state.location.pathname).toBe("/active/tasks/1"));
  });

  test("navigates when Space activates the focused title", async () => {
    const { router, user } = renderApp({ tasks: [task("1")] });
    const title = screen.getByRole("button", { name: "Task 1" });

    title.focus();
    await user.keyboard(" ");

    await waitFor(() => expect(router.state.location.pathname).toBe("/tasks/1"));
  });

  test("starts editing on Enter without navigating", async () => {
    const { router, user } = renderApp({ tasks: [task("1")] });
    const title = screen.getByRole("button", { name: "Task 1" });

    title.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("textbox", { name: "Edit task" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(router.state.location.pathname).toBe("/");
    expect(queryPanel()).toBeNull();
  });

  test("double-click edits without navigating after the guard elapses", async () => {
    const { router, user } = renderApp({ tasks: [task("1")] });

    await user.dblClick(screen.getByRole("button", { name: "Task 1" }));

    expect(await screen.findByRole("textbox", { name: "Edit task" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(router.state.location.pathname).toBe("/");
    expect(queryPanel()).toBeNull();
  });

  test("does not navigate when another title is clicked while an edit is open", async () => {
    const { router, user } = renderApp({ tasks: [task("1"), task("2")] });

    await user.dblClick(screen.getByRole("button", { name: "Task 1" }));
    await screen.findByRole("textbox", { name: "Edit task" });
    await clickTitle(user, "Task 2");

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(router.state.location.pathname).toBe("/");
    expect(queryPanel()).toBeNull();
  });

  test.each([
    ["checkbox", "Mark Task 1 as completed"],
    ["delete button", "Delete task: Task 1"],
  ])("does not navigate from the %s", async (_element, _accessibleName) => {
    const { router, user } = renderApp({ tasks: [task("1"), task("2")] });

    await user.click(screen.getByRole("checkbox", { name: "Mark Task 1 as completed" }));
    await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(router.state.location.pathname).toBe("/");
    expect(queryPanel()).toBeNull();
  });
});

describe("detail panel content", () => {
  test("shows the title, notes editor, counter and back control", () => {
    renderApp({ path: "/tasks/2", tasks: [task("2", { notes: "Existing note" })] });

    expect(panel()).toBeInTheDocument();
    expect(within(panel()).getByRole("heading", { level: 2, name: "Task 2" })).toBeInTheDocument();
    expect(within(panel()).getByText("Notes")).toBeInTheDocument();
    expect(notesField()).toHaveValue("Existing note");
    expect(notesField()).toHaveAttribute("placeholder", "Add notes...");
    expect(notesField()).toHaveAttribute("maxlength", "2000");
    expect(within(panel()).getByText("13 / 2000")).toBeInTheDocument();
    expect(within(panel()).getByRole("button", { name: "Back to list" })).toBeInTheDocument();
  });

  test("keeps only the counter under the notes field", () => {
    renderApp({ path: "/tasks/2", tasks: [task("2", { notes: "Short" })] });

    const counter = within(panel()).getByText("5 / 2000");
    expect(counter.parentElement?.textContent).toBe("5 / 2000");
    // The counter is the only caption below the field.
    expect(panel().querySelectorAll("p")).toHaveLength(1);
  });

  test("keeps only the counter under a capped notes field", () => {
    const long = "line\n".repeat(150).slice(0, 2000);
    renderApp({ path: "/tasks/2", tasks: [task("2", { notes: long })] });

    const counter = within(panel()).getByText(`${long.length} / 2000`);
    expect(counter.parentElement?.textContent).toBe(`${long.length} / 2000`);
    expect(panel().querySelectorAll("p")).toHaveLength(1);
  });

  test("shows the same single counter in Russian", () => {
    renderApp({
      path: "/tasks/2",
      tasks: [task("2", { notes: "Коротко" })],
      preferences: { language: "ru" },
    });

    expect(within(panel()).getByText("7 / 2000")).toBeInTheDocument();
    expect(panel().querySelectorAll("p")).toHaveLength(1);
  });

  test("renders the panel landmark with an accessible name", () => {
    renderApp({ path: "/tasks/1", tasks: [task("1")] });

    expect(
      within(screen.getByRole("main")).getByRole("complementary", { name: "Task 1" }),
    ).toBeInTheDocument();
  });

  test("does not offer completion, title editing or deletion inside the panel", () => {
    renderApp({ path: "/tasks/1", tasks: [task("1")] });

    expect(within(panel()).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(panel()).queryByRole("button", { name: /Delete task/ })).not.toBeInTheDocument();
    expect(within(panel()).queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
  });

  test("shows a task that the current filter would hide", () => {
    renderApp({ path: "/active/tasks/2", tasks: [task("2", { completed: true })] });

    expect(within(panel()).getByRole("heading", { level: 2, name: "Task 2" })).toBeInTheDocument();
  });
});

describe("notes editing", () => {
  test("writes notes to the store and updates the counter on every change", async () => {
    const { store, user } = renderApp({ path: "/tasks/1", tasks: [task("1")] });

    await user.type(notesField(), "Buy milk");

    expect(store.getState().tasks.items[0]?.notes).toBe("Buy milk");
    expect(within(panel()).getByText("8 / 2000")).toBeInTheDocument();
  });

  test("keeps newlines and surrounding spaces in notes", async () => {
    const { store, user } = renderApp({ path: "/tasks/1", tasks: [task("1")] });

    await user.type(notesField(), " first{Enter}{Enter}second ");

    expect(store.getState().tasks.items[0]?.notes).toBe(" first\n\nsecond ");
  });

  test("does not exceed 2000 characters", async () => {
    const { store, user } = renderApp({ path: "/tasks/1", tasks: [task("1")] });

    await user.click(notesField());
    await user.paste("a".repeat(2500));

    expect(store.getState().tasks.items[0]?.notes).toHaveLength(2000);
    expect(within(panel()).getByText("2000 / 2000")).toBeInTheDocument();
  });

  test("survives a completion toggle and a title edit from the list", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });

    await clickTitle(user, "Task 1");
    await waitFor(() => expect(queryPanel()).not.toBeNull());
    await user.type(notesField(), "Remember");

    await user.click(screen.getByRole("checkbox", { name: "Mark Task 1 as completed" }));
    await user.dblClick(screen.getByRole("button", { name: "Task 1" }));
    const editor = await screen.findByRole("textbox", { name: "Edit task" });
    await user.clear(editor);
    await user.type(editor, "Renamed");
    await user.keyboard("{Enter}");

    expect(store.getState().tasks.items[0]?.notes).toBe("Remember");
    expect(store.getState().tasks.items[0]?.title).toBe("Renamed");
    expect(notesField()).toHaveValue("Remember");
  });
});

describe("unknown task ids", () => {
  test.each([
    ["/active/tasks/missing", "/active"],
    ["/tasks/missing", "/"],
    ["/completed/tasks/missing", "/completed"],
  ])("redirects %s to %s", async (path, destination) => {
    const { router } = renderApp({ path, tasks: [task("1")] });

    await waitFor(() => expect(router.state.location.pathname).toBe(destination));
    expect(queryPanel()).toBeNull();
  });

  test("redirects after the shown task is cleared from the completed list", async () => {
    const { router, user } = renderApp({
      path: "/completed/tasks/2",
      tasks: [task("1"), task("2", { completed: true })],
    });
    expect(within(panel()).getByRole("heading", { level: 2, name: "Task 2" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Clear completed" })[0] as HTMLElement);

    await waitFor(() => expect(router.state.location.pathname).toBe("/completed"));
    expect(queryPanel()).toBeNull();
  });
});

describe("back to list", () => {
  test("returns to the filter route of the current URL", async () => {
    const { router, user } = renderApp({
      path: "/active/tasks/1",
      tasks: [task("1")],
    });

    await user.click(screen.getByRole("button", { name: "Back to list" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/active"));
    expect(screen.getByRole("heading", { level: 2, name: "Active" })).toBeInTheDocument();
    expect(queryPanel()).toBeNull();
  });

  test("focuses the row title after going back", async () => {
    const { user } = renderApp({ path: "/tasks/1", tasks: [task("1"), task("2")] });

    await user.click(screen.getByRole("button", { name: "Back to list" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Task 1" })).toHaveFocus());
  });

  test("focuses the add input when the row is not rendered", async () => {
    const { user } = renderApp({
      path: "/active/tasks/2",
      tasks: [task("1"), task("2", { completed: true })],
    });

    await user.click(screen.getByRole("button", { name: "Back to list" }));

    await waitFor(() => expect(queryPanel()).toBeNull());
    expect(screen.queryByRole("button", { name: "Task 2" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveFocus());
  });
});

describe("panel focus", () => {
  test("moves focus to the panel heading when the panel opens", async () => {
    const { user } = renderApp({ tasks: [task("1")] });

    await clickTitle(user, "Task 1");

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2, name: "Task 1" })).toHaveFocus(),
    );
  });

  test("moves focus to the heading when opening a detail URL directly", () => {
    renderApp({ path: "/tasks/1", tasks: [task("1")] });

    expect(screen.getByRole("heading", { level: 2, name: "Task 1" })).toHaveFocus();
  });
});

describe("hotkeys on a detail route", () => {
  test("keeps the route filter for the 1-3 shortcuts and the add shortcut", async () => {
    const { router, user } = renderApp({ path: "/completed/tasks/2", tasks: [task("2")] });

    await user.click(screen.getAllByRole("heading", { level: 1, name: "Tickd" })[0] as HTMLElement);
    await user.keyboard("1");

    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(screen.getByRole("heading", { level: 2, name: "All tasks" })).toBeInTheDocument();
  });
});
