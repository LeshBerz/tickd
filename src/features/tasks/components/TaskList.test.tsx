import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { renderApp } from "../../../test/renderApp.tsx";
import type { Task } from "../schema.ts";

function task(id: string, completed = false): Task {
  return { id, title: `Task ${id}`, completed, createdAt: Number(id) };
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
