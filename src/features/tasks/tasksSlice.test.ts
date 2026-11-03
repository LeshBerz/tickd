import { afterEach, describe, expect, test, vi } from "vitest";
import type { Task } from "./schema.ts";
import { add, initialState, remove, tasksSlice, toggle } from "./tasksSlice.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "First task",
    completed: false,
    createdAt: 1,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

test("initialState contains an empty items list", () => {
  expect(initialState).toEqual({ items: [] });
});

describe("add", () => {
  test("appends a task to the end", () => {
    const existing = task();
    const state = { items: [existing] };

    const next = tasksSlice.reducer(state, add("Second task"));

    expect(next.items[0]).toBe(existing);
    expect(next.items[1]?.title).toBe("Second task");
  });

  test("trims the task title", () => {
    const next = tasksSlice.reducer(initialState, add("  Write tests \t"));

    expect(next.items[0]?.title).toBe("Write tests");
  });

  test("creates an incomplete task", () => {
    const next = tasksSlice.reducer(initialState, add("Write tests"));

    expect(next.items[0]?.completed).toBe(false);
  });

  test("creates a task with a non-empty string id", () => {
    const next = tasksSlice.reducer(initialState, add("Write tests"));
    const created = next.items[0];

    expect(created).toBeDefined();
    expect(typeof created?.id).toBe("string");
    expect(created?.id.length).toBeGreaterThan(0);
  });

  test("creates unique ids across two additions", () => {
    const afterFirst = tasksSlice.reducer(initialState, add("First"));
    const afterSecond = tasksSlice.reducer(afterFirst, add("Second"));
    const [first, second] = afterSecond.items;

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second?.id).not.toBe(first?.id);
  });

  test("uses the current time as createdAt when the action is dispatched", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T09:00:00.000Z"));

    const action = add("Timed task");
    const next = tasksSlice.reducer(initialState, action);

    expect(next.items[0]?.createdAt).toBe(Date.now());
  });

  test.each(["", "   ", "\t\n"])(
    "ignores an empty title %j and returns the same state",
    (title) => {
      const state = { items: [task()] };

      const next = tasksSlice.reducer(state, add(title));

      expect(next).toBe(state);
    },
  );

  test("rejects a whitespace-only payload that bypasses prepare", () => {
    const state = { items: [task()] };
    const action = {
      type: add.type,
      payload: { id: "x", title: "   ", completed: false, createdAt: 1 },
    };

    const next = tasksSlice.reducer(state, action);

    expect(next).toBe(state);
  });
});

describe("toggle", () => {
  test("flips a task from active to completed", () => {
    const next = tasksSlice.reducer({ items: [task()] }, toggle("task-1"));

    expect(next.items[0]?.completed).toBe(true);
  });

  test("toggling twice restores the completed value", () => {
    const state = { items: [task()] };

    const afterFirst = tasksSlice.reducer(state, toggle("task-1"));
    const afterSecond = tasksSlice.reducer(afterFirst, toggle("task-1"));

    expect(afterSecond.items[0]?.completed).toBe(false);
  });

  test("changes only the targeted task", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const state = { items: [first, second] };

    const next = tasksSlice.reducer(state, toggle("task-2"));

    expect(next.items[0]).toBe(first);
    expect(next.items[1]).toEqual({ ...second, completed: true });
  });

  test("returns the same state for an unknown id", () => {
    const state = { items: [task()] };

    expect(tasksSlice.reducer(state, toggle("missing"))).toBe(state);
  });
});

describe("remove", () => {
  test("removes only the targeted task", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });

    const next = tasksSlice.reducer({ items: [first, second] }, remove("task-1"));

    expect(next.items).toEqual([second]);
  });

  test("preserves the order of remaining tasks", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const third = task({ id: "task-3", title: "Third task" });

    const next = tasksSlice.reducer({ items: [first, second, third] }, remove("task-2"));

    expect(next.items).toEqual([first, third]);
  });

  test("returns the same state for an unknown id", () => {
    const state = { items: [task()] };

    expect(tasksSlice.reducer(state, remove("missing"))).toBe(state);
  });
});
