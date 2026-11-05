import { afterEach, describe, expect, test, vi } from "vitest";
import type { Task } from "./schema.ts";
import {
  add,
  clearCompleted,
  initialState,
  remove,
  restore,
  tasksSlice,
  toggle,
  updateNotes,
  updateTitle,
} from "./tasksSlice.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "First task",
    completed: false,
    createdAt: 1,
    notes: "",
    ...overrides,
  };
}

type LastRemoved = { task: Task; index: number };

type UndoState = {
  items: Task[];
  lastRemoved: LastRemoved | null;
};

function lastRemovedFrom(state: object): unknown {
  if (!("lastRemoved" in state)) {
    return undefined;
  }
  return Reflect.get(state, "lastRemoved");
}

function asTasksState(state: UndoState): Parameters<typeof tasksSlice.reducer>[0] {
  return state as Parameters<typeof tasksSlice.reducer>[0];
}

afterEach(() => {
  vi.useRealTimers();
});

test("initialState contains an empty list and no undo snapshot", () => {
  expect({
    items: initialState.items,
    lastRemoved: lastRemovedFrom(initialState),
  }).toEqual({ items: [], lastRemoved: null });
});

describe("add", () => {
  test("appends a task to the end", () => {
    const existing = task();
    const state = { items: [existing], lastRemoved: null };

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
      const state = { items: [task()], lastRemoved: null };

      const next = tasksSlice.reducer(state, add(title));

      expect(next).toBe(state);
    },
  );

  test("rejects a whitespace-only payload that bypasses prepare", () => {
    const state = { items: [task()], lastRemoved: null };
    const action = {
      type: add.type,
      payload: { id: "x", title: "   ", completed: false, createdAt: 1 },
    };

    const next = tasksSlice.reducer(state, action);

    expect(next).toBe(state);
  });

  test("stores an emoji title after trimming the ends", () => {
    const next = tasksSlice.reducer(initialState, add("  👋  "));

    expect(next.items[0]?.title).toBe("👋");
  });

  test.each([
    ["Hebrew", "  משימה  ", "משימה"],
    ["Arabic", "  مهمة  ", "مهمة"],
  ])("stores a %s title after trimming the ends", (_script, input, title) => {
    const next = tasksSlice.reducer(initialState, add(input));

    expect(next.items[0]?.title).toBe(title);
  });

  test("stores a trimmed title of exactly 200 characters", () => {
    const title = "a".repeat(200);
    const next = tasksSlice.reducer(initialState, add(`  ${title}  `));

    expect(next.items[0]?.title).toBe(title);
  });

  test("stores 100 emoji as a 200-code-unit title", () => {
    const title = "👋".repeat(100);

    expect(title).toHaveLength(200);
    expect(tasksSlice.reducer(initialState, add(title)).items[0]?.title).toBe(title);
  });

  test("ignores a title longer than 200 characters and returns the same state", () => {
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, add("a".repeat(201)))).toBe(state);
  });

  test("ignores a title that is still longer than 200 characters after trimming", () => {
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, add(`  ${"a".repeat(201)}  `))).toBe(state);
  });

  test("ignores an emoji title longer than 200 code units and returns the same state", () => {
    const state = { items: [task()], lastRemoved: null };
    const title = `${"👋".repeat(100)}x`;

    expect(title).toHaveLength(201);
    expect(tasksSlice.reducer(state, add(title))).toBe(state);
  });

  test("rejects an over-length payload that bypasses prepare", () => {
    const state = { items: [task()], lastRemoved: null };
    const action = {
      type: add.type,
      payload: { id: "x", title: "a".repeat(201), completed: false, createdAt: 1 },
    };

    expect(tasksSlice.reducer(state, action)).toBe(state);
  });
});

describe("toggle", () => {
  test("flips a task from active to completed", () => {
    const next = tasksSlice.reducer({ items: [task()], lastRemoved: null }, toggle("task-1"));

    expect(next.items[0]?.completed).toBe(true);
  });

  test("toggling twice restores the completed value", () => {
    const state = { items: [task()], lastRemoved: null };

    const afterFirst = tasksSlice.reducer(state, toggle("task-1"));
    const afterSecond = tasksSlice.reducer(afterFirst, toggle("task-1"));

    expect(afterSecond.items[0]?.completed).toBe(false);
  });

  test("changes only the targeted task", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const state = { items: [first, second], lastRemoved: null };

    const next = tasksSlice.reducer(state, toggle("task-2"));

    expect(next.items[0]).toBe(first);
    expect(next.items[1]).toEqual({ ...second, completed: true });
  });

  test("returns the same state for an unknown id", () => {
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, toggle("missing"))).toBe(state);
  });
});

describe("remove", () => {
  test("removes only the targeted task", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });

    const next = tasksSlice.reducer(
      { items: [first, second], lastRemoved: null },
      remove("task-1"),
    );

    expect(next.items).toEqual([second]);
  });

  test("preserves the order of remaining tasks", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const third = task({ id: "task-3", title: "Third task" });

    const next = tasksSlice.reducer(
      { items: [first, second, third], lastRemoved: null },
      remove("task-2"),
    );

    expect(next.items).toEqual([first, third]);
  });

  test("returns the same state for an unknown id", () => {
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, remove("missing"))).toBe(state);
  });
});

type SliceAction = Parameters<typeof tasksSlice.reducer>[1];

function isActionCreator(value: unknown): value is () => { type: string } {
  return typeof value === "function";
}

// Loaded at call time so a missing export fails these cases only.
async function clearCompletedAction(): Promise<SliceAction> {
  const tasksModule = await import("./tasksSlice.ts");
  const creator: unknown = Reflect.get(tasksModule, "clearCompleted");
  if (!isActionCreator(creator)) {
    throw new Error("clearCompleted is not exported from tasksSlice");
  }
  return creator() as SliceAction;
}

function isUpdateTitle(value: unknown): value is (id: string, title: string) => SliceAction {
  return typeof value === "function";
}

async function undoAction(name: "restore" | "clearLastRemoved"): Promise<SliceAction> {
  const tasksModule = await import("./tasksSlice.ts");
  const creator: unknown = Reflect.get(tasksModule, name);
  if (!isActionCreator(creator)) {
    throw new Error(`${name} is not exported from tasksSlice`);
  }
  return creator() as SliceAction;
}

// Loaded at call time so a missing export fails these cases only.
async function updateTitleAction(id: string, title: string): Promise<SliceAction> {
  const tasksModule = await import("./tasksSlice.ts");
  const creator: unknown = Reflect.get(tasksModule, "updateTitle");
  if (!isUpdateTitle(creator)) {
    throw new Error("updateTitle is not exported from tasksSlice");
  }
  return creator(id, title);
}

describe("clearCompleted", () => {
  test("removes completed tasks and keeps active tasks in their relative order", async () => {
    const first = task({ id: "task-1", title: "First" });
    const second = task({ id: "task-2", title: "Second", completed: true });
    const third = task({ id: "task-3", title: "Third" });
    const fourth = task({ id: "task-4", title: "Fourth", completed: true });

    const next = tasksSlice.reducer(
      { items: [first, second, third, fourth], lastRemoved: null },
      await clearCompletedAction(),
    );

    expect(next.items).toEqual([first, third]);
  });

  test("removes every task when all tasks are completed", async () => {
    const state = {
      items: [
        task({ id: "task-1", completed: true }),
        task({ id: "task-2", title: "Second task", completed: true }),
      ],
      lastRemoved: null,
    };

    const next = tasksSlice.reducer(state, await clearCompletedAction());

    expect(next.items).toEqual([]);
  });

  test("keeps the same items reference when no task is completed", async () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const state = { items: [first, second], lastRemoved: null };

    const next = tasksSlice.reducer(state, await clearCompletedAction());

    expect(next.items).toBe(state.items);
    expect(next).toBe(state);
  });

  test("keeps the same state reference when the list is empty", async () => {
    const next = tasksSlice.reducer(initialState, await clearCompletedAction());

    expect(next).toBe(initialState);
    expect(next.items).toBe(initialState.items);
  });
});

describe("updateTitle", () => {
  test("updates the title of the matching task", async () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const state = { items: [first, second], lastRemoved: null };

    const next = tasksSlice.reducer(state, await updateTitleAction("task-2", "Renamed"));

    expect(next.items[0]).toBe(first);
    expect(next.items[1]).toEqual({ ...second, title: "Renamed" });
  });

  test("trims the title before updating", async () => {
    const next = tasksSlice.reducer(
      { items: [task()], lastRemoved: null },
      await updateTitleAction("task-1", "  Renamed task \t"),
    );

    expect(next.items[0]?.title).toBe("Renamed task");
  });

  test("updates a trimmed title of exactly 200 characters", async () => {
    const title = "a".repeat(200);

    const next = tasksSlice.reducer(
      { items: [task()], lastRemoved: null },
      await updateTitleAction("task-1", `  ${title}  `),
    );

    expect(next.items[0]?.title).toBe(title);
  });

  test("returns the same state for an unknown id", async () => {
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, await updateTitleAction("missing", "Renamed"))).toBe(state);
  });

  test.each(["", "   ", "\t\n"])(
    "ignores an empty title %j and returns the same state",
    async (title) => {
      const state = { items: [task()], lastRemoved: null };

      expect(tasksSlice.reducer(state, await updateTitleAction("task-1", title))).toBe(state);
    },
  );

  test.each([
    ["longer than 200 characters", "a".repeat(201)],
    ["still longer than 200 characters after trimming", `  ${"a".repeat(201)}  `],
  ])("ignores a title %s and returns the same state", async (_label, title) => {
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, await updateTitleAction("task-1", title))).toBe(state);
  });

  test.each(["Same", "  Same  "])(
    "keeps the same items reference when the title is %j",
    async (title) => {
      const state = { items: [task({ title: "Same" })], lastRemoved: null };

      const next = tasksSlice.reducer(state, await updateTitleAction("task-1", title));

      expect(next.items).toBe(state.items);
      expect(next).toBe(state);
    },
  );
});

describe("remove undo snapshot", () => {
  test("stores the removed task and its index", () => {
    const first = task({ id: "task-1", title: "First" });
    const second = task({ id: "task-2", title: "Second" });
    const third = task({ id: "task-3", title: "Third" });
    const state: UndoState = { items: [first, second, third], lastRemoved: null };

    const next = tasksSlice.reducer(asTasksState(state), remove("task-2"));

    expect(next.items).toEqual([first, third]);
    expect(lastRemovedFrom(next)).toEqual({ task: second, index: 1 });
  });

  test("replaces the previous snapshot when another task is removed", () => {
    const first = task({ id: "task-1", title: "First" });
    const second = task({ id: "task-2", title: "Second" });
    const third = task({ id: "task-3", title: "Third" });
    const state: UndoState = { items: [first, second, third], lastRemoved: null };

    const afterFirst = tasksSlice.reducer(asTasksState(state), remove("task-1"));
    const afterSecond = tasksSlice.reducer(afterFirst, remove("task-3"));

    expect(afterSecond.items).toEqual([second]);
    expect(lastRemovedFrom(afterSecond)).toEqual({ task: third, index: 1 });
  });

  test("keeps items and the undo snapshot when the id is unknown", () => {
    const first = task();
    const snapshot: LastRemoved = {
      task: task({ id: "task-9", title: "Removed" }),
      index: 2,
    };
    const state: UndoState = { items: [first], lastRemoved: snapshot };

    const next = tasksSlice.reducer(asTasksState(state), remove("missing"));

    expect(next).toBe(state);
    expect(next.items).toBe(state.items);
    expect(lastRemovedFrom(next)).toBe(snapshot);
  });
});

describe("restore", () => {
  test.each([
    { index: 0, order: ["removed", "first", "second"] },
    { index: 1, order: ["first", "removed", "second"] },
    { index: 2, order: ["first", "second", "removed"] },
  ] as const)("reinserts the deleted task at index $index", async ({ index, order }) => {
    const first = task({ id: "task-1", title: "First" });
    const second = task({ id: "task-2", title: "Second" });
    const removed = task({ id: "task-3", title: "Third", completed: true, createdAt: 30 });
    const byKey = { first, second, removed };
    const state: UndoState = {
      items: [first, second],
      lastRemoved: { task: removed, index },
    };

    const next = tasksSlice.reducer(asTasksState(state), await undoAction("restore"));

    expect(next.items).toEqual(order.map((key) => byKey[key]));
    expect(lastRemovedFrom(next)).toBeNull();
  });

  test("clamps the insert index when the list is shorter than the snapshot", async () => {
    const first = task({ id: "task-1", title: "First" });
    const removed = task({ id: "task-3", title: "Third" });
    const state: UndoState = {
      items: [first],
      lastRemoved: { task: removed, index: 5 },
    };

    const next = tasksSlice.reducer(asTasksState(state), await undoAction("restore"));

    expect(next.items).toEqual([first, removed]);
    expect(lastRemovedFrom(next)).toBeNull();
  });

  test("does nothing when nothing was deleted", async () => {
    const first = task();
    const state: UndoState = { items: [first], lastRemoved: null };

    const next = tasksSlice.reducer(asTasksState(state), await undoAction("restore"));

    expect(next).toBe(state);
    expect(next.items).toBe(state.items);
    expect(lastRemovedFrom(next)).toBeNull();
  });

  test("does not insert a second copy when that id is already in the list", async () => {
    const other = task({ id: "task-2", title: "Other" });
    const live = task({ id: "task-1", title: "Live title" });
    const snapshot = task({ id: "task-1", title: "Deleted title" });
    const state: UndoState = {
      items: [other, live],
      lastRemoved: { task: snapshot, index: 0 },
    };

    const next = tasksSlice.reducer(asTasksState(state), await undoAction("restore"));

    expect(next.items).toBe(state.items);
    expect(next.items.map((item) => item.title)).toEqual(["Other", "Live title"]);
    expect(lastRemovedFrom(next)).toBeNull();
  });
});

describe("clearLastRemoved", () => {
  test("clears the undo snapshot and keeps the same items array", async () => {
    const first = task();
    const state: UndoState = {
      items: [first],
      lastRemoved: { task: task({ id: "task-9", title: "Removed" }), index: 0 },
    };

    const next = tasksSlice.reducer(asTasksState(state), await undoAction("clearLastRemoved"));

    expect(next.items).toBe(state.items);
    expect(lastRemovedFrom(next)).toBeNull();
  });

  test("keeps the same state when the undo snapshot is already empty", async () => {
    const state: UndoState = { items: [task()], lastRemoved: null };

    const next = tasksSlice.reducer(asTasksState(state), await undoAction("clearLastRemoved"));

    expect(next).toBe(state);
    expect(next.items).toBe(state.items);
  });
});

describe("clearCompleted undo snapshot", () => {
  test("drops the undo snapshot when it removes completed tasks", () => {
    const active = task({ id: "task-1", title: "Active" });
    const done = task({ id: "task-2", title: "Done", completed: true });
    const removed = task({ id: "task-9", title: "Removed" });
    const state: UndoState = {
      items: [active, done],
      lastRemoved: { task: removed, index: 2 },
    };

    const next = tasksSlice.reducer(asTasksState(state), clearCompleted());

    expect(next.items).toEqual([active]);
    expect(lastRemovedFrom(next)).toBeNull();
  });

  test("clears an undo snapshot without replacing items when nothing is completed", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const state: UndoState = {
      items: [first, second],
      lastRemoved: { task: task({ id: "task-9", title: "Removed" }), index: 0 },
    };

    const next = tasksSlice.reducer(asTasksState(state), clearCompleted());

    expect(next.items).toBe(state.items);
    expect(lastRemovedFrom(next)).toBeNull();
  });

  test("clears an undo snapshot when the list is already empty", () => {
    const state: UndoState = {
      items: [],
      lastRemoved: { task: task({ id: "task-9", title: "Removed" }), index: 0 },
    };

    const next = tasksSlice.reducer(asTasksState(state), clearCompleted());

    expect(next.items).toBe(state.items);
    expect(lastRemovedFrom(next)).toBeNull();
  });

  test("returns the same state when nothing is completed and there is no undo snapshot", () => {
    const state: UndoState = { items: [task()], lastRemoved: null };

    const next = tasksSlice.reducer(asTasksState(state), clearCompleted());

    expect(next).toBe(state);
    expect(next.items).toBe(state.items);
    expect(lastRemovedFrom(next)).toBeNull();
  });
});

describe("updateNotes", () => {
  test("stores notes for the matching task", () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second task" });
    const state = { items: [first, second], lastRemoved: null };

    const next = tasksSlice.reducer(state, updateNotes("task-2", "Remember the milk"));

    expect(next.items[0]).toBe(first);
    expect(next.items[1]).toEqual({ ...second, notes: "Remember the milk" });
  });

  test("does not trim or collapse notes", () => {
    const state = { items: [task()], lastRemoved: null };
    const notes = "  spaced  \n\nmultiple lines\n";

    const next = tasksSlice.reducer(state, updateNotes("task-1", notes));

    expect(next.items[0]?.notes).toBe(notes);
  });

  test("accepts exactly 2000 characters", () => {
    const notes = "a".repeat(2000);
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, updateNotes("task-1", notes)).items[0]?.notes).toBe(notes);
  });

  test("ignores notes longer than 2000 characters and returns the same state", () => {
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, updateNotes("task-1", "a".repeat(2001)))).toBe(state);
  });

  test("ignores an over-limit payload that bypasses prepare", () => {
    const state = { items: [task()], lastRemoved: null };
    const action = { type: updateNotes.type, payload: { id: "task-1", notes: "a".repeat(2001) } };

    expect(tasksSlice.reducer(state, action)).toBe(state);
  });

  test("keeps the same state for an unknown id", () => {
    const state = { items: [task()], lastRemoved: null };

    expect(tasksSlice.reducer(state, updateNotes("missing", "Note"))).toBe(state);
  });

  test("keeps the same items reference when the value is unchanged", () => {
    const state = { items: [task({ notes: "Same" })], lastRemoved: null };

    const next = tasksSlice.reducer(state, updateNotes("task-1", "Same"));

    expect(next).toBe(state);
    expect(next.items).toBe(state.items);
  });

  test("keeps notes through toggle, title edits and an undo round trip", () => {
    const state = { items: [task({ notes: "Keep me" })], lastRemoved: null };

    const toggled = tasksSlice.reducer(state, toggle("task-1"));
    expect(toggled.items[0]?.notes).toBe("Keep me");

    const renamed = tasksSlice.reducer(toggled, updateTitle("task-1", "Renamed"));
    expect(renamed.items[0]?.notes).toBe("Keep me");

    const removed = tasksSlice.reducer(renamed, remove("task-1"));
    expect(removed.lastRemoved?.task.notes).toBe("Keep me");

    const restored = tasksSlice.reducer(removed, restore());
    expect(restored.items[0]?.notes).toBe("Keep me");
  });

  test("keeps notes of active tasks when completed tasks are cleared", () => {
    const active = task({ notes: "Active note" });
    const done = task({ id: "task-2", title: "Done", completed: true, notes: "Done note" });
    const state = { items: [active, done], lastRemoved: null };

    const next = tasksSlice.reducer(state, clearCompleted());

    expect(next.items).toEqual([active]);
    expect(next.items[0]?.notes).toBe("Active note");
  });

  test("add creates a task with empty notes", () => {
    const next = tasksSlice.reducer(initialState, add("Write tests"));

    expect(next.items[0]?.notes).toBe("");
  });
});
