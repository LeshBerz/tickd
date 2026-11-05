import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { Task } from "../features/tasks/schema.ts";
import { renderApp } from "../test/renderApp.tsx";

type AppUser = ReturnType<typeof renderApp>["user"];

function task(id: string, completed = false): Task {
  return { id, title: `Task ${id}`, completed, createdAt: Number(id) };
}

function focusBody(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }
  if (document.activeElement !== document.body) {
    throw new Error("expected focus on the page body");
  }
}

function pressKey(key: string, init: KeyboardEventInit = {}): boolean {
  const target = document.activeElement;
  if (!(target instanceof Element)) {
    throw new Error("expected a focused element");
  }
  return fireEvent.keyDown(target, { key, ...init });
}

function addInput(): HTMLElement {
  const input = screen.getByRole("textbox", { name: "Add a task" });
  expect(input).toHaveAttribute("id", "tickd-add-task");
  return input;
}

function queryUndoToast(): HTMLElement | null {
  return (
    screen.queryAllByRole("status").find((element) => {
      return element.textContent?.includes("Task deleted") === true;
    }) ?? null
  );
}

function listTitles(): string[] {
  return screen.getAllByRole("listitem").map((item) => {
    const title = within(item).getByRole("button", { name: /^Task / });
    return title.textContent ?? "";
  });
}

async function openTitleEditor(user: AppUser, title: string): Promise<HTMLElement> {
  await user.dblClick(screen.getByRole("button", { name: title }));
  const editor = await screen.findByRole("textbox", { name: "Edit task" });
  await waitFor(() => expect(editor).toHaveFocus());
  return editor;
}

test.each([
  ["n", { code: "KeyN" }],
  ["N", { code: "KeyN", shiftKey: true }],
])("focuses the add field when %s is pressed outside a text field", (key, init) => {
  const { router } = renderApp({ tasks: [task("1")] });
  focusBody();

  pressKey(key, init);

  expect(addInput()).toHaveFocus();
  expect(router.state.location.pathname).toBe("/");
});

test("focuses the add field and cancels the browser default when / is pressed", () => {
  renderApp({ tasks: [task("1")] });
  focusBody();

  expect(pressKey("/", { code: "Slash" })).toBe(false);
  expect(addInput()).toHaveFocus();
});

test.each([
  ["1", "/active", "/", "All tasks"],
  ["2", "/", "/active", "Active"],
  ["3", "/", "/completed", "Completed"],
])("pressing %s from %s navigates to %s", (key, from, path, heading) => {
  const { router } = renderApp({
    path: from,
    tasks: [task("1"), task("2", true)],
  });
  focusBody();

  pressKey(key);

  expect(router.state.location.pathname).toBe(path);
  expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
});

test.each([
  ["z", { code: "KeyZ" }],
  ["Z", { code: "KeyZ", shiftKey: true }],
])("restores the deleted task when %s is pressed", async (key, init) => {
  const { user } = renderApp({ tasks: [task("1"), task("2"), task("3")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 2" }));
  expect(listTitles()).toEqual(["Task 1", "Task 3"]);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Delete task: Task 3" })).toHaveFocus();
  });

  pressKey(key, init);

  expect(listTitles()).toEqual(["Task 1", "Task 2", "Task 3"]);
  expect(queryUndoToast()).toBeNull();
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Task 2" })).toHaveFocus();
  });
});

test("does nothing and does not cancel the key when z is pressed with no undo", () => {
  const { store } = renderApp({ tasks: [task("1"), task("2")] });
  const items = store.getState().tasks.items;
  focusBody();

  expect(pressKey("z", { code: "KeyZ" })).toBe(true);
  expect(pressKey("Z", { code: "KeyZ", shiftKey: true })).toBe(true);

  expect(store.getState().tasks.items).toBe(items);
  expect(queryUndoToast()).toBeNull();
  expect(screen.getByRole("button", { name: "Task 1" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Task 2" })).toBeInTheDocument();
});

test("focuses the add field when z restores a task hidden by the current filter", async () => {
  const { store, user } = renderApp({ tasks: [task("1"), task("2", true)] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));
  const completed = screen.getAllByRole("link", { name: /^Completed/ })[0];
  if (completed === undefined) {
    throw new Error("Completed filter is missing");
  }
  await user.click(completed);
  expect(screen.getByRole("heading", { level: 2, name: "Completed" })).toBeInTheDocument();
  expect(queryUndoToast()).not.toBeNull();

  focusBody();
  pressKey("z", { code: "KeyZ" });

  expect(queryUndoToast()).toBeNull();
  expect(store.getState().tasks.items.map((item) => item.title)).toEqual(["Task 1", "Task 2"]);
  expect(screen.queryByRole("button", { name: "Task 1" })).not.toBeInTheDocument();
  await waitFor(() => expect(addInput()).toHaveFocus());
});

test.each([
  ["Ctrl", { ctrlKey: true }],
  ["Meta", { metaKey: true }],
  ["Alt", { altKey: true }],
])("ignores add, filter, and undo hotkeys while %s is held", async (_modifier, init) => {
  const { router, user } = renderApp({ tasks: [task("1"), task("2")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 2" }));
  focusBody();

  expect(pressKey("n", { code: "KeyN", ...init })).toBe(true);
  expect(addInput()).not.toHaveFocus();
  expect(pressKey("/", { code: "Slash", ...init })).toBe(true);
  expect(addInput()).not.toHaveFocus();
  expect(pressKey("2", init)).toBe(true);
  expect(router.state.location.pathname).toBe("/");
  expect(pressKey("z", { code: "KeyZ", ...init })).toBe(true);
  expect(screen.queryByRole("button", { name: "Task 2" })).not.toBeInTheDocument();
});

test("ignores hotkeys while the add field is focused", async () => {
  const { router, user } = renderApp({ tasks: [task("1"), task("2")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));
  const input = addInput();
  input.focus();

  expect(pressKey("n", { code: "KeyN" })).toBe(true);
  expect(pressKey("N", { code: "KeyN", shiftKey: true })).toBe(true);
  expect(pressKey("/", { code: "Slash" })).toBe(true);
  expect(pressKey("2")).toBe(true);
  expect(pressKey("z", { code: "KeyZ" })).toBe(true);
  expect(pressKey("Z", { code: "KeyZ", shiftKey: true })).toBe(true);

  expect(input).toHaveFocus();
  expect(router.state.location.pathname).toBe("/");
  expect(screen.queryByRole("button", { name: "Task 1" })).not.toBeInTheDocument();
});

test("ignores hotkeys while a task title is being edited", async () => {
  const { router, user } = renderApp({ tasks: [task("1"), task("2"), task("3")] });

  await user.click(screen.getByRole("button", { name: "Delete task: Task 3" }));
  const editor = await openTitleEditor(user, "Task 1");
  await user.clear(editor);
  await user.type(editor, "Draft title");

  expect(pressKey("n", { code: "KeyN" })).toBe(true);
  expect(pressKey("/", { code: "Slash" })).toBe(true);
  expect(pressKey("3")).toBe(true);
  expect(pressKey("z", { code: "KeyZ" })).toBe(true);
  expect(pressKey("Z", { code: "KeyZ", shiftKey: true })).toBe(true);

  expect(router.state.location.pathname).toBe("/");
  expect(screen.getByRole("textbox", { name: "Edit task" })).toHaveFocus();
  expect(screen.getByRole("textbox", { name: "Edit task" })).toHaveValue("Draft title");
  expect(screen.queryByRole("button", { name: "Task 3" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Draft title" })).not.toBeInTheDocument();
});

test("ignores hotkeys from textarea, select, and contenteditable targets", () => {
  const { router } = renderApp({ tasks: [task("1")] });
  const textarea = document.createElement("textarea");
  const select = document.createElement("select");
  const editable = document.createElement("div");
  editable.setAttribute("contenteditable", "true");
  const inner = document.createElement("span");
  inner.textContent = "note";
  editable.append(inner);
  document.body.append(textarea, select, editable);

  try {
    for (const target of [textarea, select, editable, inner]) {
      expect(fireEvent.keyDown(target, { key: "2" })).toBe(true);
      expect(router.state.location.pathname).toBe("/");
      expect(fireEvent.keyDown(target, { key: "/", code: "Slash" })).toBe(true);
      expect(addInput()).not.toHaveFocus();
    }
  } finally {
    textarea.remove();
    select.remove();
    editable.remove();
  }
});

test("still opens Active when 2 is pressed on contenteditable=false", () => {
  const { router } = renderApp({ tasks: [task("1")] });
  const locked = document.createElement("div");
  locked.setAttribute("contenteditable", "false");
  locked.textContent = "label";
  document.body.append(locked);

  try {
    fireEvent.keyDown(locked, { key: "2" });
    expect(router.state.location.pathname).toBe("/active");
    expect(screen.getByRole("heading", { level: 2, name: "Active" })).toBeInTheDocument();
  } finally {
    locked.remove();
  }
});
