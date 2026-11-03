import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { Task } from "../schema.ts";
import { TaskItem } from "./TaskItem.tsx";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write tests",
    completed: false,
    createdAt: 1,
    ...overrides,
  };
}

test("requests a toggle from its labelled checkbox", async () => {
  const onToggle = vi.fn();
  const user = userEvent.setup();
  render(<TaskItem task={task()} onToggle={onToggle} onRemove={vi.fn()} />);

  await user.click(screen.getByRole("checkbox", { name: "Mark Write tests as completed" }));

  expect(onToggle).toHaveBeenCalledOnce();
  expect(onToggle).toHaveBeenCalledWith("task-1");
});

test("shows a completed task with a line through its title", () => {
  render(<TaskItem task={task({ completed: true })} onToggle={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getByText("Write tests")).toHaveClass("line-through");
  expect(screen.getByRole("checkbox", { name: "Mark Write tests as completed" })).toBeChecked();
});

test("renders an emoji title as text", () => {
  render(<TaskItem task={task({ title: "👋" })} onToggle={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getAllByText("👋").length).toBeGreaterThan(0);
});

test("renders a Hebrew title as text", () => {
  render(<TaskItem task={task({ title: "משימה" })} onToggle={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getAllByText("משימה").length).toBeGreaterThan(0);
});

test("renders an Arabic title as text", () => {
  render(<TaskItem task={task({ title: "مهمة" })} onToggle={vi.fn()} onRemove={vi.fn()} />);

  expect(screen.getAllByText("مهمة").length).toBeGreaterThan(0);
});

test("renders a 200-character unbroken title that can wrap", () => {
  const title = "a".repeat(200);
  render(<TaskItem task={task({ title })} onToggle={vi.fn()} onRemove={vi.fn()} />);

  const node = screen
    .getAllByText(title)
    .find((element) => element.classList.contains("break-words"));

  expect(node).toBeDefined();
  expect(node).toHaveClass("break-words");
  expect(node).toHaveClass("min-w-0");
});

test("requests removal from its labelled delete button", async () => {
  const onRemove = vi.fn();
  const user = userEvent.setup();
  render(<TaskItem task={task()} onToggle={vi.fn()} onRemove={onRemove} />);

  await user.click(screen.getByRole("button", { name: "Delete task: Write tests" }));

  expect(onRemove).toHaveBeenCalledOnce();
  expect(onRemove).toHaveBeenCalledWith("task-1");
});
