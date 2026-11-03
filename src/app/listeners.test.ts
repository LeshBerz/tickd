import { describe, expect, test, vi } from "vitest";
import type { Task } from "../features/tasks/schema.ts";
import { add, remove, toggle } from "../features/tasks/tasksSlice.ts";
import { makeStore } from "./store.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Stored task",
    completed: false,
    createdAt: 1,
    ...overrides,
  };
}

function expectStorageToMatch(tasks: Task[]): void {
  expect(localStorage.getItem("tickd:tasks")).toBe(JSON.stringify({ version: 1, tasks }));
}

test("creating a store with empty storage does not write", () => {
  const setItem = vi.spyOn(Storage.prototype, "setItem");

  makeStore();

  expect(setItem).not.toHaveBeenCalled();
});

test("creating a store loads valid version 1 tasks", () => {
  const tasks = [task()];
  localStorage.setItem("tickd:tasks", JSON.stringify({ version: 1, tasks }));

  const store = makeStore();

  expect(store.getState().tasks.items).toEqual(tasks);
});

test("creating a store loads and migrates version 0 tasks", () => {
  const tasks = [task()];
  localStorage.setItem("tickd:tasks", JSON.stringify(tasks));

  const store = makeStore();

  expect(store.getState().tasks.items).toEqual(tasks);
});

describe("persistence listener", () => {
  test("stores a version 1 payload matching state after add", () => {
    const store = makeStore();

    store.dispatch(add("New task"));

    expectStorageToMatch(store.getState().tasks.items);
  });

  test("updates storage after toggle", () => {
    const existing = task();
    const store = makeStore({ tasks: { items: [existing] } });

    store.dispatch(toggle(existing.id));

    expectStorageToMatch(store.getState().tasks.items);
  });

  test("updates storage after remove", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const store = makeStore({ tasks: { items: [first, second] } });

    store.dispatch(remove(first.id));

    expectStorageToMatch(store.getState().tasks.items);
  });

  test("preserves corrupted storage through no-ops and replaces it on the first real add", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const corrupted = "{not json";
    localStorage.setItem("tickd:tasks", corrupted);

    const store = makeStore();

    expect(store.getState().tasks.items).toEqual([]);
    expect(localStorage.getItem("tickd:tasks")).toBe(corrupted);

    store.dispatch(add("   "));
    store.dispatch(toggle("missing"));
    store.dispatch(remove("missing"));

    expect(localStorage.getItem("tickd:tasks")).toBe(corrupted);

    store.dispatch(add("First real task"));

    expect(store.getState().tasks.items).toHaveLength(1);
    expectStorageToMatch(store.getState().tasks.items);
  });
});

test("preloaded state is used instead of storage", () => {
  const stored = task({ title: "From storage" });
  const preloaded = task({ id: "task-2", title: "Preloaded" });
  localStorage.setItem("tickd:tasks", JSON.stringify({ version: 1, tasks: [stored] }));

  const store = makeStore({ tasks: { items: [preloaded] } });

  expect(store.getState().tasks.items).toEqual([preloaded]);
});
