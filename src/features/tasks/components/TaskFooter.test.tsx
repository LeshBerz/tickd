import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, test } from "vitest";
import { makeStore } from "../../../app/store.ts";
import type { Task } from "../schema.ts";
import { TaskFooter } from "./TaskFooter.tsx";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write tests",
    completed: false,
    createdAt: 1,
    ...overrides,
  };
}

function renderFooter(items: Task[]) {
  const store = makeStore({ tasks: { items } });
  const user = userEvent.setup();
  const router = createMemoryRouter([{ path: "/", element: <TaskFooter variant="desktop" /> }], {
    initialEntries: ["/"],
  });
  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );

  return { ...view, store, user };
}

describe("TaskFooter", () => {
  test("renders nothing when there are no tasks", () => {
    const { container } = renderFooter([]);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "Clear completed" })).not.toBeInTheDocument();
    expect(screen.queryByText(/items? left/)).not.toBeInTheDocument();
  });

  test("shows the singular count of active tasks when a completed task is also present", () => {
    renderFooter([
      task({ id: "active", title: "Active task" }),
      task({ id: "done", title: "Done task", completed: true }),
    ]);

    expect(screen.getByText("1 item left")).toBeInTheDocument();
    expect(screen.queryByText("2 items left")).not.toBeInTheDocument();
  });

  test("shows the plural count when two tasks are active", () => {
    renderFooter([task({ id: "1", title: "First" }), task({ id: "2", title: "Second" })]);

    expect(screen.getByText("2 items left")).toBeInTheDocument();
  });

  test("shows zero items left when every task is completed", () => {
    renderFooter([
      task({ id: "1", title: "First", completed: true }),
      task({ id: "2", title: "Second", completed: true }),
    ]);

    expect(screen.getByText("0 items left")).toBeInTheDocument();
  });

  test("disables Clear completed when no task is completed", () => {
    renderFooter([task({ id: "1", title: "First" }), task({ id: "2", title: "Second" })]);
    const button = screen.getByRole("button", { name: "Clear completed" });

    expect(button).toBeDisabled();
    expect(button).toHaveProperty("disabled", true);
  });

  test("enables Clear completed when a task is completed", () => {
    renderFooter([task({ completed: true })]);
    const button = screen.getByRole("button", { name: "Clear completed" });

    expect(button).toBeEnabled();
    expect(button).toHaveProperty("disabled", false);
    expect(button).toHaveAttribute("type", "button");
  });

  test("removes completed tasks when Clear completed is clicked", async () => {
    const first = task({ id: "1", title: "First" });
    const second = task({ id: "2", title: "Second", completed: true });
    const third = task({ id: "3", title: "Third" });
    const { store, user } = renderFooter([first, second, third]);

    await user.click(screen.getByRole("button", { name: "Clear completed" }));

    expect(store.getState().tasks.items).toEqual([first, third]);
    expect(screen.getByText("2 items left")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear completed" })).toBeDisabled();
  });

  test("does not remove tasks when Clear completed is disabled", async () => {
    const items = [task({ id: "1", title: "First" }), task({ id: "2", title: "Second" })];
    const { store, user } = renderFooter(items);
    const button = screen.getByRole("button", { name: "Clear completed" });
    const before = store.getState().tasks.items;

    expect(button).toBeDisabled();
    await user.click(button);

    expect(store.getState().tasks.items).toBe(before);
    expect(store.getState().tasks.items).toEqual(items);
  });
});
