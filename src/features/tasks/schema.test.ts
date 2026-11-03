import { describe, expect, test } from "vitest";
import { CURRENT_STORAGE_VERSION, migrate, parseStoredTasks, type Task } from "./schema.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write tests",
    completed: false,
    createdAt: 1,
    ...overrides,
  };
}

describe("parseStoredTasks", () => {
  test("parses valid version 1 data", () => {
    const tasks = [task()];

    expect(parseStoredTasks({ version: 1, tasks })).toEqual(tasks);
  });

  test("migrates a valid version 0 bare array to the same tasks", () => {
    const tasks = [task()];

    expect(parseStoredTasks(tasks)).toEqual(tasks);
  });

  test.each([
    ["version 0", []],
    ["version 1", { version: 1, tasks: [] }],
  ])("parses an empty task list in %s format", (_format, stored) => {
    expect(parseStoredTasks(stored)).toEqual([]);
  });

  test.each([
    ["null", null],
    ["a number", 1],
    ["a string", "tasks"],
    ["a plain object", {}],
    ["an unknown version", { version: 2, tasks: [] }],
    ["a string version", { version: "1", tasks: [] }],
    ["missing tasks", { version: 1 }],
  ])("rejects %s", (_description, stored) => {
    expect(parseStoredTasks(stored)).toBeNull();
  });

  test.each([
    ["an empty title", task({ title: "" })],
    ["a whitespace-only title", task({ title: " \t\n " })],
    ["a non-boolean completed value", { ...task(), completed: "false" }],
    ["a non-integer createdAt", task({ createdAt: 1.5 })],
    ["a negative createdAt", task({ createdAt: -1 })],
    ["an empty id", task({ id: "" })],
    ["a missing id", { title: "Write tests", completed: false, createdAt: 1 }],
    ["a missing title", { id: "task-1", completed: false, createdAt: 1 }],
    ["a missing completed field", { id: "task-1", title: "Write tests", createdAt: 1 }],
    ["a missing createdAt", { id: "task-1", title: "Write tests", completed: false }],
  ])("rejects a task with %s", (_description, invalidTask) => {
    expect(parseStoredTasks({ version: 1, tasks: [invalidTask] })).toBeNull();
  });

  test("rejects the entire payload when one task is invalid", () => {
    const stored = {
      version: 1,
      tasks: [task(), task({ id: "task-2", title: "   " })],
    };

    expect(parseStoredTasks(stored)).toBeNull();
  });

  test("trims task titles on read", () => {
    const stored = { version: 1, tasks: [task({ title: "  Write tests \t" })] };

    expect(parseStoredTasks(stored)).toEqual([task()]);
  });

  test("strips unknown keys from stored payloads and tasks", () => {
    const stored = {
      version: 1,
      tasks: [{ ...task(), extraTaskKey: true }],
      extraPayloadKey: true,
    };

    expect(parseStoredTasks(stored)).toEqual([task()]);
  });

  test("rejects a title longer than 200 characters after trim", () => {
    expect(
      parseStoredTasks({
        version: 1,
        tasks: [task({ title: ` \t${"a".repeat(201)}\t ` })],
      }),
    ).toBeNull();
  });

  test.each([
    [
      "version 1",
      {
        version: 1,
        tasks: [task(), task({ id: "task-2", title: "a".repeat(201) })],
      },
    ],
    ["version 0", [task(), task({ id: "task-2", title: "a".repeat(201) })]],
  ])(
    "rejects the entire %s payload when one title is longer than 200 characters",
    (_format, stored) => {
      expect(parseStoredTasks(stored)).toBeNull();
    },
  );

  test("accepts a title of exactly 200 characters", () => {
    const storedTask = task({ title: "a".repeat(200) });

    expect(parseStoredTasks({ version: 1, tasks: [storedTask] })).toEqual([storedTask]);
  });

  test("accepts a title of exactly 200 characters after trim", () => {
    const title = "a".repeat(200);

    expect(parseStoredTasks({ version: 1, tasks: [task({ title: `  ${title}  ` })] })).toEqual([
      task({ title }),
    ]);
  });

  test.each([
    ["an emoji", "👋"],
    ["Hebrew text", "משימה"],
    ["Arabic text", "مهمة"],
    ["emoji and right-to-left text", "👋 משימה مهمة"],
  ])("accepts %s in a title", (_description, title) => {
    const storedTask = task({ title });

    expect(parseStoredTasks({ version: 1, tasks: [storedTask] })).toEqual([storedTask]);
  });

  test("accepts 100 emoji as a 200-code-unit title", () => {
    const title = "👋".repeat(100);
    const storedTask = task({ title });

    expect(title).toHaveLength(200);
    expect(parseStoredTasks({ version: 1, tasks: [storedTask] })).toEqual([storedTask]);
  });

  test("rejects a title of 201 code units", () => {
    const title = `${"👋".repeat(100)}x`;

    expect(title).toHaveLength(201);
    expect(parseStoredTasks({ version: 1, tasks: [task({ title })] })).toBeNull();
  });
});

describe("migrate", () => {
  test("wraps version 0 tasks in a version 1 payload", () => {
    const tasks = [task()];

    expect(migrate(tasks)).toEqual({ version: 1, tasks });
  });

  test("keeps version 1 data equal", () => {
    const stored = { version: 1 as const, tasks: [task()] };

    expect(migrate(stored)).toEqual(stored);
  });
});

test("CURRENT_STORAGE_VERSION is 1", () => {
  expect(CURRENT_STORAGE_VERSION).toBe(1);
});
