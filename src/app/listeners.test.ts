import { describe, expect, test, vi } from "vitest";
import type { Task } from "../features/tasks/schema.ts";
import { add, remove, toggle } from "../features/tasks/tasksSlice.ts";
import { makeStore, type RootState } from "./store.ts";

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
  } as Partial<RootState>);
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
  } as Partial<RootState>);

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
  } as Partial<RootState>);

  expect(store.getState().tasks.items).toEqual([]);
  expect(persistenceFrom(store).loadDiscarded).toBe(false);
  expect(localStorage.getItem("tickd:tasks")).toBe("{not json");
});
