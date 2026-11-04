import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { routes } from "../../../app/router.tsx";
import { makeStore } from "../../../app/store.ts";
import { renderApp } from "../../../test/renderApp.tsx";
import type { Task } from "../schema.ts";

const DISCARDED_COPY = "Couldn't restore saved tasks. Starting fresh.";

type AppUser = ReturnType<typeof renderApp>["user"];

function task(id: string, completed = false): Task {
  return { id, title: `Task ${id}`, completed, createdAt: Number(id) };
}

function appShell(): HTMLElement {
  const shell = screen.getByRole("main").parentElement;
  if (!(shell instanceof HTMLElement)) {
    throw new Error("app shell is missing");
  }
  return shell;
}

function undoToast(): HTMLElement {
  const toast = screen.getAllByRole("status").find((element) => {
    return element.textContent?.includes("Task deleted") === true;
  });
  if (toast === undefined) {
    throw new Error("undo toast is missing");
  }
  return toast;
}

function queryUndoToast(): HTMLElement | null {
  return (
    screen.queryAllByRole("status").find((element) => {
      return element.textContent?.includes("Task deleted") === true;
    }) ?? null
  );
}

function toastMessage(toast: HTMLElement): string {
  const undo = within(toast).getByRole("button", { name: "Undo" });
  const full = toast.textContent ?? "";
  return full
    .replace(undo.textContent ?? "", "")
    .replace(/\s+/g, " ")
    .trim();
}

function listTitles(): string[] {
  return screen.getAllByRole("listitem").map((item) => {
    const title = within(item).getByRole("button", { name: /^Task / });
    return title.textContent ?? "";
  });
}

function renderTimedApp(tasks: Task[]) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  const store = makeStore({ tasks: { items: tasks } });
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  const view = render(
    <StrictMode>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </StrictMode>,
  );

  return { ...view, store };
}

function clickButton(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

afterEach(() => {
  vi.useRealTimers();
});

test("shows Task deleted and Undo after a task is removed", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2")] });
  expect(queryUndoToast()).toBeNull();
  expect(appShell()).not.toHaveClass("has-toast");

  await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));

  const toast = undoToast();
  expect(toastMessage(toast)).toBe("Task deleted");
  expect(toast).not.toHaveAttribute("aria-label");
  const undo = within(toast).getByRole("button", { name: "Undo" });
  expect(undo).toHaveAttribute("type", "button");
  expect(undo).toHaveTextContent(/^Undo$/);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(appShell()).toHaveClass("has-toast");
  expect(screen.getByRole("main")).toContainElement(toast);
});

test("puts the undo toast after the task footers", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));

  const toast = undoToast();
  expect(screen.getByRole("main")).toContainElement(toast);
  const clearButtons = screen.getAllByRole("button", { name: "Clear completed" });
  expect(clearButtons.length).toBeGreaterThan(0);
  for (const button of clearButtons) {
    expect(button.compareDocumentPosition(toast) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  }
});

test("restores the deleted task between its neighbours", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2"), task("3")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 2" }));
  expect(listTitles()).toEqual(["Task 1", "Task 3"]);

  await user.click(within(undoToast()).getByRole("button", { name: "Undo" }));

  expect(listTitles()).toEqual(["Task 1", "Task 2", "Task 3"]);
  expect(queryUndoToast()).toBeNull();
  expect(appShell()).not.toHaveClass("has-toast");
});

test("undo restores only the latest deleted task", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2"), task("3")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 2" }));
  await user.click(screen.getByRole("button", { name: "Delete task: Task 3" }));
  await user.click(within(undoToast()).getByRole("button", { name: "Undo" }));

  expect(listTitles()).toEqual(["Task 1", "Task 3"]);
  expect(screen.queryByRole("button", { name: "Task 2" })).not.toBeInTheDocument();
  expect(queryUndoToast()).toBeNull();
});

test("hides the toast after 5000ms without changing the remaining tasks", async () => {
  const { store } = renderTimedApp([task("1"), task("2"), task("3")]);
  const setItem = vi.spyOn(Storage.prototype, "setItem");

  clickButton("Delete task: Task 2");

  expect(toastMessage(undoToast())).toBe("Task deleted");
  const writesAfterDelete = setItem.mock.calls.length;
  const itemsAfterDelete = store.getState().tasks.items;
  expect(listTitles()).toEqual(["Task 1", "Task 3"]);

  await advance(4999);
  expect(queryUndoToast()).not.toBeNull();
  expect(store.getState().tasks.items).toBe(itemsAfterDelete);

  await advance(1);
  expect(queryUndoToast()).toBeNull();
  expect(appShell()).not.toHaveClass("has-toast");
  expect(store.getState().tasks.items).toBe(itemsAfterDelete);
  expect(listTitles()).toEqual(["Task 1", "Task 3"]);
  expect(setItem).toHaveBeenCalledTimes(writesAfterDelete);
  const saved = localStorage.getItem("tickd:tasks");
  expect(saved).not.toBeNull();
  if (saved !== null) {
    expect(JSON.parse(saved)).toEqual({ version: 1, tasks: itemsAfterDelete });
    expect(JSON.parse(saved)).not.toHaveProperty("lastRemoved");
  }
});

test("a new delete resets the 5000ms hide timer", async () => {
  const { store } = renderTimedApp([task("1"), task("2"), task("3")]);

  clickButton("Delete task: Task 2");
  expect(queryUndoToast()).not.toBeNull();
  await advance(4000);
  expect(queryUndoToast()).not.toBeNull();

  clickButton("Delete task: Task 3");
  const itemsAfterSecondDelete = store.getState().tasks.items;
  await advance(1000);
  expect(queryUndoToast()).not.toBeNull();
  expect(store.getState().tasks.items).toBe(itemsAfterSecondDelete);

  await advance(3999);
  expect(queryUndoToast()).not.toBeNull();
  await advance(1);
  expect(queryUndoToast()).toBeNull();
  expect(store.getState().tasks.items).toBe(itemsAfterSecondDelete);
  expect(listTitles()).toEqual(["Task 1"]);
});

test("does not move focus onto the undo toast when it appears", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2"), task("3")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 2" }));

  expect(within(undoToast()).getByRole("button", { name: "Undo" })).not.toHaveFocus();
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Delete task: Task 3" })).toHaveFocus();
  });
});

test("leaves focus on the add field when the only task is deleted", async () => {
  const { user } = renderApp({ tasks: [task("1")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));

  expect(within(undoToast()).getByRole("button", { name: "Undo" })).not.toHaveFocus();
  await waitFor(() => {
    expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveFocus();
  });
});

test("focuses the restored task title", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2"), task("3")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 2" }));
  await user.click(within(undoToast()).getByRole("button", { name: "Undo" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Task 2" })).toHaveFocus();
  });
});

test("focuses the add input when the restored task is hidden by the filter", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2", true)] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));
  const completed = screen.getAllByRole("link", { name: /^Completed/ })[0];
  if (completed === undefined) {
    throw new Error("Completed filter is missing");
  }
  await user.click(completed);
  expect(screen.getByRole("heading", { level: 2, name: "Completed" })).toBeInTheDocument();

  await user.click(within(undoToast()).getByRole("button", { name: "Undo" }));

  const input = screen.getByRole("textbox", { name: "Add a task" });
  await waitFor(() => {
    expect(input).toHaveFocus();
  });
  expect(input).toHaveAttribute("id", "tickd-add-task");
  expect(screen.queryByRole("button", { name: "Task 1" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Task 2" })).toBeInTheDocument();
});

test("hides the undo toast when completed tasks are cleared", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2", true)] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));
  expect(undoToast()).toBeInTheDocument();

  await clickClearCompleted(user);

  expect(queryUndoToast()).toBeNull();
  expect(appShell()).not.toHaveClass("has-toast");
  expect(screen.queryByRole("button", { name: "Task 1" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Task 2" })).not.toBeInTheDocument();
});

test("does not offer undo after clearing completed tasks", async () => {
  const { user } = renderApp({ tasks: [task("1"), task("2", true)] });

  await clickClearCompleted(user);

  expect(queryUndoToast()).toBeNull();
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  expect(appShell()).not.toHaveClass("has-toast");
  expect(screen.queryByRole("button", { name: "Task 2" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Task 1" })).toBeInTheDocument();
});

test("keeps the storage banner separate from the undo toast", async () => {
  const { user } = renderApp({
    tasks: [task("1"), task("2")],
    persistence: {
      available: true,
      loadDiscarded: true,
      saveError: null,
      availabilityDismissed: false,
    },
  });
  expect(screen.getByText(DISCARDED_COPY)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));

  const banner = screen.getByText(DISCARDED_COPY);
  const toast = undoToast();
  expect(banner.contains(toast) || toast.contains(banner)).toBe(false);

  await user.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(screen.queryByText(DISCARDED_COPY)).not.toBeInTheDocument();
  expect(undoToast()).toBeInTheDocument();

  await user.click(within(undoToast()).getByRole("button", { name: "Undo" }));

  expect(queryUndoToast()).toBeNull();
  expect(screen.queryByText(DISCARDED_COPY)).not.toBeInTheDocument();
  expect(listTitles()).toEqual(["Task 1", "Task 2"]);
});

async function clickClearCompleted(user: AppUser) {
  const button = screen.getAllByRole("button", { name: "Clear completed" })[0];
  if (button === undefined) {
    throw new Error("Clear completed is missing");
  }
  await user.click(button);
}
