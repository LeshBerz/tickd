import { describe, expect, test } from "vitest";
import { persistenceSlice } from "../../app/persistenceSlice.ts";
import type { RootState } from "../../app/store.ts";
import type { Task } from "./schema.ts";
import { selectTaskCounts, selectTasks, selectVisibleTasks } from "./selectors.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "First task",
    completed: false,
    createdAt: 1,
    ...overrides,
  };
}

function stateWith(items: Task[]): RootState {
  return {
    tasks: { items },
    persistence: persistenceSlice.getInitialState(),
  };
}

test("selectTasks returns the task items", () => {
  const items = [task()];

  expect(selectTasks(stateWith(items))).toBe(items);
});

describe("selectVisibleTasks", () => {
  const first = task();
  const second = task({ id: "task-2", title: "Second task", completed: true });
  const third = task({ id: "task-3", title: "Third task" });

  test("returns all tasks in order for the all filter", () => {
    const items = [first, second, third];

    expect(selectVisibleTasks(stateWith(items), "all")).toEqual([first, second, third]);
  });

  test("returns the original items reference for the all filter", () => {
    const items = [first, second, third];

    expect(selectVisibleTasks(stateWith(items), "all")).toBe(items);
  });

  test("returns active tasks in their original order", () => {
    expect(selectVisibleTasks(stateWith([first, second, third]), "active")).toEqual([first, third]);
  });

  test("returns completed tasks in their original order", () => {
    expect(selectVisibleTasks(stateWith([first, second, third]), "completed")).toEqual([second]);
  });

  test("memoizes the result for the same state and filter", () => {
    const state = stateWith([first, second, third]);

    const firstResult = selectVisibleTasks(state, "active");
    const secondResult = selectVisibleTasks(state, "active");

    expect(secondResult).toBe(firstResult);
  });

  test.each(["all", "active", "completed"] as const)(
    "returns an empty list for the %s filter when there are no tasks",
    (filter) => {
      expect(selectVisibleTasks(stateWith([]), filter)).toEqual([]);
    },
  );
});

describe("selectTaskCounts", () => {
  test("counts mixed tasks", () => {
    const items = [
      task(),
      task({ id: "task-2", completed: true }),
      task({ id: "task-3", completed: false }),
    ];

    expect(selectTaskCounts(stateWith(items))).toEqual({ all: 3, active: 2, completed: 1 });
  });

  test("returns zero counts for an empty list", () => {
    expect(selectTaskCounts(stateWith([]))).toEqual({ all: 0, active: 0, completed: 0 });
  });

  test("counts an all-completed list", () => {
    const items = [task({ completed: true }), task({ id: "task-2", completed: true })];

    expect(selectTaskCounts(stateWith(items))).toEqual({ all: 2, active: 0, completed: 2 });
  });

  test("memoizes the count object for the same state", () => {
    const state = stateWith([task()]);

    const firstResult = selectTaskCounts(state);
    const secondResult = selectTaskCounts(state);

    expect(secondResult).toBe(firstResult);
  });
});
