import { describe, expect, test, vi } from "vitest";
import type { Task } from "./schema.ts";
import { loadTasks, saveTasks, TASKS_STORAGE_KEY } from "./storage.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Persist tasks",
    completed: false,
    createdAt: 1,
    ...overrides,
  };
}

function silenceWarnings(): void {
  vi.spyOn(console, "warn").mockImplementation(() => {});
}

test("TASKS_STORAGE_KEY is tickd:tasks", () => {
  expect(TASKS_STORAGE_KEY).toBe("tickd:tasks");
});

describe("loadTasks", () => {
  test("returns an empty list when the key is absent", () => {
    expect(loadTasks()).toEqual([]);
  });

  test.each([
    ["invalid JSON", "{not json"],
    ["JSON null", "null"],
    ["an unknown version", JSON.stringify({ version: 2, tasks: [] })],
    [
      "invalid task fields",
      JSON.stringify({
        version: 1,
        tasks: [{ id: "task-1", title: "Persist tasks", completed: "no", createdAt: 1 }],
      }),
    ],
  ])("returns an empty list for %s", (_description, stored) => {
    silenceWarnings();
    localStorage.setItem("tickd:tasks", stored);

    expect(loadTasks()).toEqual([]);
  });

  test("loads and migrates version 0 data", () => {
    const tasks = [task()];
    localStorage.setItem("tickd:tasks", JSON.stringify(tasks));

    expect(loadTasks()).toEqual(tasks);
  });

  test("does not rewrite version 0 data while loading it", () => {
    const stored = JSON.stringify([task()]);
    localStorage.setItem("tickd:tasks", stored);

    loadTasks();

    expect(localStorage.getItem("tickd:tasks")).toBe(stored);
  });

  test("loads version 1 data", () => {
    const tasks = [task()];
    localStorage.setItem("tickd:tasks", JSON.stringify({ version: 1, tasks }));

    expect(loadTasks()).toEqual(tasks);
  });

  test("returns an empty list without throwing when getItem throws", () => {
    silenceWarnings();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(() => loadTasks()).not.toThrow();
    expect(loadTasks()).toEqual([]);
  });

  test("does not overwrite corrupted stored data", () => {
    silenceWarnings();
    const corrupted = "{not json";
    localStorage.setItem("tickd:tasks", corrupted);

    loadTasks();

    expect(localStorage.getItem("tickd:tasks")).toBe(corrupted);
  });
});

describe("saveTasks", () => {
  test("writes a version 1 payload under the storage key", () => {
    const tasks = [task()];

    saveTasks(tasks);

    expect(localStorage.getItem("tickd:tasks")).toBe(JSON.stringify({ version: 1, tasks }));
  });

  test("round-trips tasks through storage", () => {
    const tasks = [task(), task({ id: "task-2", completed: true, createdAt: 2 })];

    saveTasks(tasks);

    expect(loadTasks()).toEqual(tasks);
  });

  test("does not throw when setItem throws", () => {
    silenceWarnings();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(() => saveTasks([task()])).not.toThrow();
  });
});
