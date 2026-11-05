import { describe, expect, test, vi } from "vitest";
import { setAccent, setTheme } from "../features/preferences/preferencesSlice.ts";
import { DEFAULT_PREFERENCES } from "../features/preferences/schema.ts";
import { PREFERENCES_STORAGE_KEY } from "../features/preferences/storage.ts";
import type { Task } from "../features/tasks/schema.ts";
import { add, remove, toggle } from "../features/tasks/tasksSlice.ts";
import { makeStore } from "./store.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Stored task",
    completed: false,
    createdAt: 1,
    notes: "",
    ...overrides,
  };
}

function expectStorageToMatch(tasks: Task[]): void {
  expect(localStorage.getItem("tickd:tasks")).toBe(JSON.stringify({ version: 2, tasks }));
}

type PersistenceState = {
  available: boolean;
  loadDiscarded: boolean;
  saveError: "quota" | "unavailable" | null;
  availabilityDismissed: boolean;
};

function persistenceFrom(store: ReturnType<typeof makeStore>): PersistenceState {
  const persistence = (store.getState() as { persistence?: PersistenceState }).persistence;
  if (persistence === undefined) {
    throw new Error("persistence state is missing");
  }
  return persistence;
}

test("creating a store with empty storage does not write tasks", () => {
  makeStore();

  expect(localStorage.getItem("tickd:tasks")).toBeNull();
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

test("creating a store from corrupted storage marks the load as discarded", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.setItem("tickd:tasks", "{not json");

  const store = makeStore();

  expect(store.getState().tasks.items).toEqual([]);
  expect(localStorage.getItem("tickd:tasks")).toBe("{not json");
  expect(persistenceFrom(store)).toEqual({
    available: true,
    loadDiscarded: true,
    saveError: null,
    availabilityDismissed: false,
  });
});

test("creating a store when storage cannot be probed marks storage unavailable", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });

  const store = makeStore();

  expect(store.getState().tasks.items).toEqual([]);
  expect(persistenceFrom(store)).toEqual({
    available: false,
    loadDiscarded: false,
    saveError: null,
    availabilityDismissed: false,
  });
});

test("does not record a save error when saving succeeds", () => {
  const store = makeStore();

  store.dispatch(add("Saved task"));

  expect(persistenceFrom(store).saveError).toBeNull();
});

test("records a quota error when saving exceeds storage", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const store = makeStore({ tasks: { items: [] } });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  });

  store.dispatch(add("Needs space"));

  expect(store.getState().tasks.items.map((item) => item.title)).toEqual(["Needs space"]);
  expect(persistenceFrom(store).saveError).toBe("quota");
});

test("records unavailable when saving fails for another reason", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const store = makeStore({ tasks: { items: [] } });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });

  store.dispatch(add("Needs space"));

  expect(persistenceFrom(store).saveError).toBe("unavailable");
});

test("skips save when storage was unavailable at load", () => {
  const store = makeStore({
    tasks: { items: [] },
    persistence: {
      available: false,
      loadDiscarded: false,
      saveError: null,
      availabilityDismissed: false,
    },
  });
  const setItem = vi.spyOn(Storage.prototype, "setItem");

  store.dispatch(add("Stays in memory only"));

  expect(store.getState().tasks.items.map((item) => item.title)).toEqual(["Stays in memory only"]);
  expect(setItem).not.toHaveBeenCalled();
  expect(persistenceFrom(store).saveError).toBeNull();
  expect(localStorage.getItem("tickd:tasks")).toBeNull();
});

test("clears a save error after a later save succeeds", () => {
  const store = makeStore({
    tasks: { items: [] },
    persistence: {
      available: true,
      loadDiscarded: false,
      saveError: "quota",
      availabilityDismissed: false,
    },
  });

  store.dispatch(add("Fits again"));

  expect(store.getState().tasks.items).toHaveLength(1);
  expect(persistenceFrom(store).saveError).toBeNull();
});

test("keeps preloaded persistence when tasks are passed in", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.setItem("tickd:tasks", "{not json");

  const store = makeStore({
    tasks: { items: [] },
    persistence: {
      available: true,
      loadDiscarded: false,
      saveError: null,
      availabilityDismissed: false,
    },
  });

  expect(store.getState().tasks.items).toEqual([]);
  expect(persistenceFrom(store).loadDiscarded).toBe(false);
  expect(localStorage.getItem("tickd:tasks")).toBe("{not json");
});

describe("preference persistence is separate from task persistence", () => {
  test("saving a preference does not touch the tasks key", () => {
    const store = makeStore({ tasks: { items: [task()] } });

    store.dispatch(setTheme("dark"));

    expect(localStorage.getItem("tickd:tasks")).toBeNull();
    expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "null")).toMatchObject({
      version: 1,
      theme: "dark",
    });
  });

  test("saving a task does not touch the preferences key", () => {
    const store = makeStore({
      tasks: { items: [] },
      preferences: { theme: "light" },
    });

    store.dispatch(add("New task"));

    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();
    expectStorageToMatch(store.getState().tasks.items);
  });

  test("a failing preference write leaves task persistence healthy", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = makeStore({ tasks: { items: [] } });
    const original = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === PREFERENCES_STORAGE_KEY) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      original.call(this, key, value);
    });

    store.dispatch(setAccent("violet"));

    const persistence = persistenceFrom(store);
    expect(persistence.saveError).toBeNull();

    store.dispatch(add("Still saved"));

    expectStorageToMatch(store.getState().tasks.items);
    expect(setItem).toHaveBeenCalledWith("tickd:tasks", expect.any(String));
  });

  test("a store created without preload reads preferences from their own key", () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: 1, theme: "dark", language: "ru" }),
    );

    const store = makeStore();

    expect(store.getState().preferences).toMatchObject({ theme: "dark", language: "ru" });
    expect(localStorage.getItem("tickd:tasks")).toBeNull();
  });

  test("corrupted preferences fall back to defaults without a storage banner", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem(PREFERENCES_STORAGE_KEY, "{not json");

    const store = makeStore();

    expect(store.getState().preferences).toEqual(DEFAULT_PREFERENCES);
    expect(persistenceFrom(store)).toMatchObject({ available: true, loadDiscarded: false });
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBe("{not json");
  });
});

type UndoAction = { type: string };

function isActionCreator(value: unknown): value is () => UndoAction {
  return typeof value === "function";
}

async function undoAction(name: "restore" | "clearLastRemoved"): Promise<UndoAction> {
  const tasksModule = await import("../features/tasks/tasksSlice.ts");
  const creator: unknown = Reflect.get(tasksModule, name);
  if (!isActionCreator(creator)) {
    throw new Error(`${name} is not exported from tasksSlice`);
  }
  return creator();
}

function lastRemovedOf(store: ReturnType<typeof makeStore>): unknown {
  const tasks: unknown = store.getState().tasks;
  if (typeof tasks !== "object" || tasks === null) {
    throw new Error("tasks state is missing");
  }
  if (!("lastRemoved" in tasks)) {
    return undefined;
  }
  return Reflect.get(tasks, "lastRemoved");
}

describe("undo persistence", () => {
  test("preloaded tasks start with no undo snapshot", () => {
    const store = makeStore({ tasks: { items: [task()] } });

    expect(store.getState().tasks.items).toEqual([task()]);
    expect(lastRemovedOf(store)).toBeNull();
  });

  test("tasks loaded from storage start with no undo snapshot", () => {
    const stored = task({ title: "From storage" });
    localStorage.setItem("tickd:tasks", JSON.stringify({ version: 1, tasks: [stored] }));

    const store = makeStore();

    expect(store.getState().tasks.items).toEqual([stored]);
    expect(lastRemovedOf(store)).toBeNull();
  });

  test("remove saves remaining tasks and keeps the undo snapshot out of storage", () => {
    const first = task({ id: "task-1", title: "First" });
    const second = task({ id: "task-2", title: "Second" });
    const store = makeStore({ tasks: { items: [first, second] } });

    store.dispatch(remove(second.id));

    expect(lastRemovedOf(store)).toEqual({ task: second, index: 1 });
    expectStorageToMatch([first]);
    const raw = localStorage.getItem("tickd:tasks");
    if (raw === null) {
      throw new Error("tasks were not saved");
    }
    expect(JSON.parse(raw)).not.toHaveProperty("lastRemoved");
  });

  test("restore writes the task back without an undo snapshot", async () => {
    const first = task({ id: "task-1", title: "First" });
    const second = task({ id: "task-2", title: "Second" });
    const store = makeStore({ tasks: { items: [first, second] } });
    store.dispatch(remove(first.id));

    store.dispatch(await undoAction("restore"));

    expect(store.getState().tasks.items).toEqual([first, second]);
    expect(lastRemovedOf(store)).toBeNull();
    expectStorageToMatch([first, second]);
  });

  test("clearing the undo snapshot does not write storage", async () => {
    const first = task();
    const second = task({ id: "task-2", title: "Second" });
    const store = makeStore({ tasks: { items: [first, second] } });
    store.dispatch(remove(first.id));
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const saved = localStorage.getItem("tickd:tasks");

    store.dispatch(await undoAction("clearLastRemoved"));

    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem("tickd:tasks")).toBe(saved);
    expect(store.getState().tasks.items).toEqual([second]);
    expect(lastRemovedOf(store)).toBeNull();
  });
});
