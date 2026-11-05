import { describe, expect, test } from "vitest";
import { CURRENT_STORAGE_VERSION, migrate, parseStoredTasks, type Task } from "./schema.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write tests",
    completed: false,
    createdAt: 1,
    notes: "",
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

  test("parses valid version 2 data with notes", () => {
    const tasks = [task({ notes: "First line\nsecond line" })];

    expect(parseStoredTasks({ version: 2, tasks })).toEqual(tasks);
  });

  test.each([
    ["version 0", [task()]],
    [
      "version 1",
      {
        version: 1,
        tasks: [{ id: "task-1", title: "Write tests", completed: false, createdAt: 1 }],
      },
    ],
  ])("migrates %s data by adding empty notes", (_format, stored) => {
    expect(parseStoredTasks(stored)).toEqual([task({ notes: "" })]);
  });

  test("ignores an unknown notes key in legacy payloads", () => {
    const stored = {
      version: 1,
      tasks: [{ ...task(), notes: 42 }],
    };

    expect(parseStoredTasks(stored)).toEqual([task({ notes: "" })]);
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
    ["an unknown version", { version: 3, tasks: [] }],
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

describe("notes in stored payloads", () => {
  test("keeps notes exactly as stored, including newlines and surrounding spaces", () => {
    const notes = "  line one\nline two  \n";
    const storedTask = task({ notes });

    expect(parseStoredTasks({ version: 2, tasks: [storedTask] })).toEqual([storedTask]);
  });

  test("accepts notes of exactly 2000 characters", () => {
    const notes = "a".repeat(2000);
    const storedTask = task({ notes });

    expect(parseStoredTasks({ version: 2, tasks: [storedTask] })).toEqual([storedTask]);
  });

  test("rejects notes longer than 2000 characters", () => {
    expect(parseStoredTasks({ version: 2, tasks: [task({ notes: "a".repeat(2001) })] })).toBeNull();
  });

  test.each([
    ["a number", 1],
    ["null", null],
  ])("rejects version 2 tasks with %s in notes", (_description, notes) => {
    expect(parseStoredTasks({ version: 2, tasks: [{ ...task(), notes }] })).toBeNull();
  });

  test("rejects version 2 tasks without a notes field", () => {
    const legacyTask = { id: "task-1", title: "Write tests", completed: false, createdAt: 1 };

    expect(parseStoredTasks({ version: 2, tasks: [legacyTask] })).toBeNull();
  });

  test("discards the whole version 2 payload when one notes value is invalid", () => {
    const stored = {
      version: 2,
      tasks: [task(), task({ id: "task-2", notes: "a".repeat(2001) })],
    };

    expect(parseStoredTasks(stored)).toBeNull();
  });
});

describe("migrate", () => {
  test("wraps version 0 tasks in the current payload and adds empty notes", () => {
    const tasks = [task()];

    expect(migrate(tasks)).toEqual({ version: 2, tasks });
  });

  test("upgrades version 1 data to version 2 with empty notes", () => {
    const stored = {
      version: 1 as const,
      tasks: [{ id: "task-1", title: "Write tests", completed: false, createdAt: 1 }],
    };

    expect(migrate(stored)).toEqual({ version: 2, tasks: [task()] });
  });

  test("keeps version 2 data equal", () => {
    const stored = { version: 2 as const, tasks: [task()] };

    expect(migrate(stored)).toEqual(stored);
  });

  test("does not mutate the input payload or its tasks", () => {
    const legacyTask = { id: "task-1", title: "Write tests", completed: false, createdAt: 1 };
    const v0 = [legacyTask];
    const v1 = { version: 1 as const, tasks: [legacyTask] };
    const v2 = { version: 2 as const, tasks: [task({ notes: "Kept" })] };
    const v0Snapshot = structuredClone(v0);
    const v1Snapshot = structuredClone(v1);
    const v2Snapshot = structuredClone(v2);

    migrate(v0);
    migrate(v1);
    migrate(v2);

    expect(v0).toEqual(v0Snapshot);
    expect(v1).toEqual(v1Snapshot);
    expect(v2).toEqual(v2Snapshot);
  });
});

test("CURRENT_STORAGE_VERSION is 2", () => {
  expect(CURRENT_STORAGE_VERSION).toBe(2);
});
