import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";
import type { Task } from "../schema.ts";

function task(id: string, completed = false): Task {
  return { id, title: `Task ${id}`, completed, createdAt: Number(id) };
}

type AppUser = ReturnType<typeof renderApp>["user"];

async function openTitleEditor(user: AppUser, title: string) {
  await user.dblClick(screen.getByRole("button", { name: title }));
  return screen.findByRole("textbox", { name: "Edit task" });
}

function clickOutsideEdit(user: AppUser) {
  return user.click(screen.getByRole("heading", { level: 2, name: "All tasks" }));
}

const threeActiveTasks = [task("1"), task("2"), task("3")];

describe("TaskList actions", () => {
  test("toggles a task to completed", async () => {
    const { user } = renderApp({ tasks: [task("1")] });

    await user.click(screen.getByRole("checkbox", { name: "Mark Task 1 as completed" }));

    expect(screen.getByRole("checkbox", { name: "Mark Task 1 as completed" })).toBeChecked();
    expect(screen.getByText("Task 1")).toHaveClass("line-through");
  });

  test("removes a task", async () => {
    const { user } = renderApp({ tasks: [task("1"), task("2")] });

    await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));

    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
  });
});

describe("TaskList focus management", () => {
  test("moves focus to the next delete button after deleting a middle row", async () => {
    const { user } = renderApp({ tasks: threeActiveTasks });

    await user.click(screen.getByRole("button", { name: "Delete task: Task 2" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete task: Task 3" })).toHaveFocus(),
    );
  });

  test("moves focus to the previous delete button after deleting the last row", async () => {
    const { user } = renderApp({ tasks: threeActiveTasks });

    await user.click(screen.getByRole("button", { name: "Delete task: Task 3" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete task: Task 2" })).toHaveFocus(),
    );
  });

  test("moves focus to the add input after deleting the last remaining row", async () => {
    const { user } = renderApp({ tasks: [task("1")] });

    await user.click(screen.getByRole("button", { name: "Delete task: Task 1" }));

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveFocus());
  });

  test("moves focus to the next checkbox when a toggled task leaves the active view", async () => {
    const { user } = renderApp({ path: "/active", tasks: threeActiveTasks });

    await user.click(screen.getByRole("checkbox", { name: "Mark Task 2 as completed" }));

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Mark Task 3 as completed" })).toHaveFocus(),
    );
  });

  test("moves focus to the next checkbox when a toggled task leaves the completed view", async () => {
    const completedTasks = [task("1", true), task("2", true), task("3", true)];
    const { user } = renderApp({ path: "/completed", tasks: completedTasks });

    await user.click(screen.getByRole("checkbox", { name: "Mark Task 2 as completed" }));

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Mark Task 3 as completed" })).toHaveFocus(),
    );
  });

  test("moves focus to the previous checkbox when the last row leaves the active view", async () => {
    const { user } = renderApp({ path: "/active", tasks: threeActiveTasks });

    await user.click(screen.getByRole("checkbox", { name: "Mark Task 3 as completed" }));

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Mark Task 2 as completed" })).toHaveFocus(),
    );
  });

  test("moves focus to the add input when toggling empties the filtered view", async () => {
    const { user } = renderApp({ path: "/active", tasks: [task("1")] });

    await user.click(screen.getByRole("checkbox", { name: "Mark Task 1 as completed" }));

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveFocus());
  });

  test("keeps focus on the same checkbox when toggling in the all view", async () => {
    const { user } = renderApp({ tasks: [task("1"), task("2")] });
    const checkbox = screen.getByRole("checkbox", { name: "Mark Task 1 as completed" });

    await user.click(checkbox);

    expect(checkbox).toHaveFocus();
    expect(checkbox).toBeChecked();
  });
});

describe("TaskList titles", () => {
  test("renders emoji, right-to-left titles, and a long unbroken title", () => {
    const longTitle = "c".repeat(200);
    renderApp({
      tasks: [
        { id: "emoji", title: "👋", completed: false, createdAt: 1 },
        { id: "hebrew", title: "משימה", completed: false, createdAt: 2 },
        { id: "arabic", title: "مهمة", completed: false, createdAt: 3 },
        { id: "long", title: longTitle, completed: false, createdAt: 4 },
      ],
    });

    expect(screen.getAllByText("👋").length).toBeGreaterThan(0);
    expect(screen.getAllByText("משימה").length).toBeGreaterThan(0);
    expect(screen.getAllByText("مهمة").length).toBeGreaterThan(0);
    const node = screen
      .getAllByText(longTitle)
      .find((element) => element.classList.contains("break-words"));
    expect(node).toBeDefined();
    expect(node).toHaveClass("min-w-0");
  });
});

describe("TaskList title editing", () => {
  test("shows an editor with the current title when the title is double-clicked", async () => {
    const { user } = renderApp({ tasks: [task("1")] });

    const editor = await openTitleEditor(user, "Task 1");

    expect(editor).toHaveValue("Task 1");
    await waitFor(() => expect(editor).toHaveFocus());
    expect(editor.closest("li")).toHaveClass("border-accent");
  });

  test("shows an editor when Enter is pressed on the focused title", async () => {
    const { user } = renderApp({ tasks: [task("1")] });
    const titleButton = screen.getByRole("button", { name: "Task 1" });

    titleButton.focus();
    await user.keyboard("{Enter}");

    const editor = await screen.findByRole("textbox", { name: "Edit task" });
    expect(editor).toHaveValue("Task 1");
    await waitFor(() => expect(editor).toHaveFocus());
  });

  test("does not edit a task when its title is clicked once", async () => {
    const { user } = renderApp({ tasks: [task("1")] });

    await user.click(screen.getByRole("button", { name: "Task 1" }));

    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Task 1" })).toBeInTheDocument();
  });

  test("does not edit a task when Space is pressed on its title", async () => {
    const { user } = renderApp({ tasks: [task("1")] });
    const titleButton = screen.getByRole("button", { name: "Task 1" });

    titleButton.focus();
    await user.keyboard(" ");

    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(titleButton).toBeInTheDocument();
  });

  test("saves a trimmed title when Enter is pressed", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });

    const editor = await openTitleEditor(user, "Task 1");
    await user.clear(editor);
    await user.type(editor, "  Renamed task  ");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Renamed task" })).toHaveFocus();
    });
    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(store.getState().tasks.items[0]).toMatchObject({
      id: "1",
      title: "Renamed task",
      completed: false,
    });
  });

  test("restores the original title when Escape is pressed", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });
    const items = store.getState().tasks.items;
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.type(editor, "Draft title");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(screen.queryByText("Task can't be empty")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Task 1" })).toHaveFocus();
    });
    expect(store.getState().tasks.items).toBe(items);
  });

  test("keeps editing and shows an error when Enter is pressed on an empty title", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });
    const items = store.getState().tasks.items;
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.keyboard("{Enter}");

    const editing = screen.getByRole("textbox", { name: "Edit task" });
    expect(screen.getByText("Task can't be empty")).toBeInTheDocument();
    expect(editing).toHaveAttribute("aria-invalid", "true");
    expect(editing).toHaveValue("");
    expect(editing).toHaveFocus();
    expect(store.getState().tasks.items).toBe(items);
  });

  test("keeps editing and shows an error when Enter is pressed on a whitespace-only title", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });
    const items = store.getState().tasks.items;
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.type(editor, "   ");
    await user.keyboard("{Enter}");

    const editing = screen.getByRole("textbox", { name: "Edit task" });
    expect(screen.getByText("Task can't be empty")).toBeInTheDocument();
    expect(editing).toHaveAttribute("aria-invalid", "true");
    expect(editing).toHaveValue("   ");
    expect(editing).toHaveFocus();
    expect(store.getState().tasks.items).toBe(items);
  });

  test("clears the empty-title error when the edit field is typed in", async () => {
    const { user } = renderApp({ tasks: [task("1")] });
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.keyboard("{Enter}");
    expect(screen.getByText("Task can't be empty")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Edit task" }), "a");

    expect(screen.queryByText("Task can't be empty")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Edit task" })).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("turns a multi-line paste in the edit field into a single line", async () => {
    const { user } = renderApp({ tasks: [task("1")] });
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.paste("hello\n\nworld");

    expect(editor).toHaveValue("hello world");
  });

  test("does not let a paste in the edit field exceed 200 characters", async () => {
    const { user } = renderApp({ tasks: [task("1")] });
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.paste("b".repeat(250));

    expect(editor).toHaveValue("b".repeat(200));
  });

  test("saves a trimmed title when the edit field blurs", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.type(editor, "  Renamed task  ");
    await clickOutsideEdit(user);

    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renamed task" })).toBeInTheDocument();
    expect(store.getState().tasks.items[0]?.title).toBe("Renamed task");
  });

  test("cancels editing when the edit field blurs empty", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });
    const items = store.getState().tasks.items;
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await clickOutsideEdit(user);

    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(screen.queryByText("Task can't be empty")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Task 1" })).toBeInTheDocument();
    expect(store.getState().tasks.items).toBe(items);
  });

  test("cancels editing when the edit field blurs with only whitespace", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });
    const items = store.getState().tasks.items;
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.type(editor, "   ");
    await clickOutsideEdit(user);

    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(screen.queryByText("Task can't be empty")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Task 1" })).toBeInTheDocument();
    expect(store.getState().tasks.items).toBe(items);
  });

  test("closes editing without changing tasks when the trimmed title is unchanged", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });
    const items = store.getState().tasks.items;
    const editor = await openTitleEditor(user, "Task 1");

    await user.clear(editor);
    await user.type(editor, "  Task 1  ");
    await clickOutsideEdit(user);

    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Task 1" })).toBeInTheDocument();
    expect(store.getState().tasks.items).toBe(items);
    expect(store.getState().tasks.items[0]?.title).toBe("Task 1");
  });

  test("edits only one task at a time and discards the other draft", async () => {
    const { store, user } = renderApp({
      tasks: [
        { id: "1", title: "First", completed: false, createdAt: 1 },
        { id: "2", title: "Second", completed: false, createdAt: 2 },
      ],
    });
    const items = store.getState().tasks.items;
    const firstEditor = await openTitleEditor(user, "First");

    await user.clear(firstEditor);
    await user.type(firstEditor, "Draft");
    await user.dblClick(screen.getByRole("button", { name: "Second" }));

    await waitFor(() => {
      expect(screen.getAllByRole("textbox", { name: "Edit task" })).toHaveLength(1);
    });
    const editor = screen.getByRole("textbox", { name: "Edit task" });
    expect(editor).toHaveValue("Second");
    await waitFor(() => expect(editor).toHaveFocus());
    expect(screen.getByRole("button", { name: "First" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Draft" })).not.toBeInTheDocument();
    expect(store.getState().tasks.items).toBe(items);
    expect(store.getState().tasks.items[0]?.title).toBe("First");
  });

  test("saves on blur a second time after a previous blur save", async () => {
    const { store, user } = renderApp({ tasks: [task("1")] });
    const firstEditor = await openTitleEditor(user, "Task 1");

    await user.clear(firstEditor);
    await user.type(firstEditor, "First rename");
    await clickOutsideEdit(user);
    expect(screen.getByRole("button", { name: "First rename" })).toBeInTheDocument();

    const secondEditor = await openTitleEditor(user, "First rename");
    await user.clear(secondEditor);
    await user.type(secondEditor, "Second rename");
    await clickOutsideEdit(user);

    expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Second rename" })).toBeInTheDocument();
    expect(store.getState().tasks.items[0]?.title).toBe("Second rename");
  });

  test("saves the draft when another title is single-clicked during edit", async () => {
    const { store, user } = renderApp({
      tasks: [
        { id: "1", title: "First", completed: false, createdAt: 1 },
        { id: "2", title: "Second", completed: false, createdAt: 2 },
      ],
    });
    const editor = await openTitleEditor(user, "First");

    await user.clear(editor);
    await user.type(editor, "Saved draft");
    await user.click(screen.getByRole("button", { name: "Second" }));

    await waitFor(
      () => {
        expect(screen.queryByRole("textbox", { name: "Edit task" })).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
    expect(screen.getByRole("button", { name: "Saved draft" })).toBeInTheDocument();
    expect(store.getState().tasks.items[0]?.title).toBe("Saved draft");
    expect(screen.getByRole("button", { name: "Second" })).toBeInTheDocument();
  });

  test("shows Enter and Esc hints while editing when keyboard hints are on", async () => {
    const { user } = renderApp({ tasks: [task("1")] });
    const editor = await openTitleEditor(user, "Task 1");
    const form = editor.closest("form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("edit form is missing");
    }

    const kbds = Array.from(form.querySelectorAll("kbd"));
    expect(kbds.map((kbd) => kbd.textContent)).toEqual(["Enter", "Esc"]);
    expect(form).toHaveTextContent("to save");
    expect(form).toHaveTextContent("to cancel");

    let hint: HTMLElement | null = kbds[0] instanceof HTMLElement ? kbds[0] : null;
    while (hint !== null && hint !== form && !hint.classList.contains("hidden")) {
      hint = hint.parentElement;
    }
    expect(hint).not.toBeNull();
    expect(hint?.className ?? "").toMatch(/fine-pointer:/);
  });
});
