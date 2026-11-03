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

const discardedLoad = {
  tasks: [],
  available: true,
  discarded: true,
};

const unavailableLoad = {
  tasks: [],
  available: false,
  discarded: false,
};

function availableTasks(tasks: Task[]) {
  return { tasks, available: true, discarded: false };
}

test("TASKS_STORAGE_KEY is tickd:tasks", () => {
  expect(TASKS_STORAGE_KEY).toBe("tickd:tasks");
});

describe("loadTasks", () => {
  test("returns no tasks when the key is absent", () => {
    expect(loadTasks()).toEqual(availableTasks([]));
    expect(localStorage.getItem("tickd:tasks")).toBeNull();
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
  ])("discards %s and keeps storage available", (_description, stored) => {
    silenceWarnings();
    localStorage.setItem("tickd:tasks", stored);

    expect(loadTasks()).toEqual(discardedLoad);
  });

  test("loads and migrates version 0 data", () => {
    const tasks = [task()];
    localStorage.setItem("tickd:tasks", JSON.stringify(tasks));

    expect(loadTasks()).toEqual(availableTasks(tasks));
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

    expect(loadTasks()).toEqual(availableTasks(tasks));
  });

  test("returns no tasks without throwing when getItem throws", () => {
    silenceWarnings();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(() => loadTasks()).not.toThrow();
    expect(loadTasks()).toEqual(unavailableLoad);
  });

  test("reports storage unavailable when the probe cannot write", () => {
    silenceWarnings();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(() => loadTasks()).not.toThrow();
    expect(loadTasks()).toEqual(unavailableLoad);
    expect(localStorage.getItem("tickd:tasks")).toBeNull();
  });

  test("keeps readable tasks when the write probe fails", () => {
    silenceWarnings();
    const tasks = [task()];
    localStorage.setItem("tickd:tasks", JSON.stringify({ version: 1, tasks }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    expect(loadTasks()).toEqual({ tasks, available: false, discarded: false });
  });

  test("does not overwrite corrupted stored data", () => {
    silenceWarnings();
    const corrupted = "{not json";
    localStorage.setItem("tickd:tasks", corrupted);

    loadTasks();

    expect(localStorage.getItem("tickd:tasks")).toBe(corrupted);
  });

  test("discards a stored title longer than 200 characters without rewriting it", () => {
    silenceWarnings();
    const stored = JSON.stringify({
      version: 1,
      tasks: [task({ title: "a".repeat(201) })],
    });
    localStorage.setItem("tickd:tasks", stored);

    expect(loadTasks()).toEqual(discardedLoad);
    expect(localStorage.getItem("tickd:tasks")).toBe(stored);
  });
});

describe("saveTasks", () => {
  test("writes a version 1 payload under the storage key", () => {
    const tasks = [task()];

    expect(saveTasks(tasks)).toBe("ok");
    expect(localStorage.getItem("tickd:tasks")).toBe(JSON.stringify({ version: 1, tasks }));
  });

  test("round-trips tasks through storage", () => {
    const tasks = [task(), task({ id: "task-2", completed: true, createdAt: 2 })];

    expect(saveTasks(tasks)).toBe("ok");
    expect(loadTasks()).toEqual(availableTasks(tasks));
  });

  test("returns quota when setItem throws QuotaExceededError", () => {
    silenceWarnings();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(() => saveTasks([task()])).not.toThrow();
    expect(saveTasks([task()])).toBe("quota");
  });

  test("returns quota when the error is named QuotaExceededError", () => {
    silenceWarnings();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const error = new Error("quota");
      error.name = "QuotaExceededError";
      throw Object.assign(error, { code: 0 });
    });

    expect(saveTasks([task()])).toBe("quota");
  });

  test.each([22, 1014])("returns quota when setItem throws an error with code %s", (code) => {
    silenceWarnings();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const error = new Error("quota");
      error.name = "Unknown";
      throw Object.assign(error, { code });
    });

    expect(saveTasks([task()])).toBe("quota");
  });

  test("returns unavailable when setItem throws a generic error", () => {
    silenceWarnings();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => saveTasks([task()])).not.toThrow();
    expect(saveTasks([task()])).toBe("unavailable");
    expect(localStorage.getItem("tickd:tasks")).toBeNull();
  });
});
