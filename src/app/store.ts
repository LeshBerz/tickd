import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { loadTasks } from "../features/tasks/storage.ts";
import { tasksSlice } from "../features/tasks/tasksSlice.ts";
import { listenerMiddleware } from "./listeners.ts";
import { persistenceSlice } from "./persistenceSlice.ts";

export const rootReducer = combineSlices(tasksSlice, persistenceSlice);

export type RootState = ReturnType<typeof rootReducer>;

/** Partial slices for tests — missing task fields are filled with defaults. */
export type StorePreload = {
  tasks?: Partial<RootState["tasks"]>;
  persistence?: Partial<RootState["persistence"]>;
};

function mergeTasksPreload(
  tasks: Partial<RootState["tasks"]> | undefined,
): RootState["tasks"] | undefined {
  if (tasks === undefined) {
    return undefined;
  }
  return {
    items: tasks.items ?? [],
    lastRemoved: tasks.lastRemoved ?? null,
  };
}

export function makeStore(preloadedState?: StorePreload) {
  if (preloadedState !== undefined) {
    const tasks = mergeTasksPreload(preloadedState.tasks);
    return configureStore({
      reducer: rootReducer,
      preloadedState: {
        ...preloadedState,
        ...(tasks === undefined ? {} : { tasks }),
      } as Partial<RootState>,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(listenerMiddleware.middleware),
    });
  }

  const loaded = loadTasks();
  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      tasks: { items: loaded.tasks, lastRemoved: null },
      persistence: {
        available: loaded.available,
        loadDiscarded: loaded.discarded,
        saveError: null,
        availabilityDismissed: false,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
