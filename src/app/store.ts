import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { guideSlice } from "../features/guide/guideSlice.ts";
import { preferencesSlice } from "../features/preferences/preferencesSlice.ts";
import { DEFAULT_PREFERENCES } from "../features/preferences/schema.ts";
import { loadPreferences } from "../features/preferences/storage.ts";
import { loadTasks } from "../features/tasks/storage.ts";
import { tasksSlice } from "../features/tasks/tasksSlice.ts";
import { listenerMiddleware } from "./listeners.ts";
import { persistenceSlice } from "./persistenceSlice.ts";

export const rootReducer = combineSlices(
  tasksSlice,
  persistenceSlice,
  preferencesSlice,
  guideSlice,
);

export type RootState = ReturnType<typeof rootReducer>;

/** Partial slices for tests — missing task fields are filled with defaults. */
export type StorePreload = {
  tasks?: Partial<RootState["tasks"]>;
  persistence?: Partial<RootState["persistence"]>;
  preferences?: Partial<RootState["preferences"]>;
  guide?: Partial<RootState["guide"]>;
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

function mergePreferencesPreload(
  preferences: Partial<RootState["preferences"]> | undefined,
): RootState["preferences"] {
  return { ...DEFAULT_PREFERENCES, ...preferences };
}

export function makeStore(preloadedState?: StorePreload) {
  if (preloadedState !== undefined) {
    const tasks = mergeTasksPreload(preloadedState.tasks);
    const guide = { open: false, ...preloadedState.guide };
    return configureStore({
      reducer: rootReducer,
      preloadedState: {
        ...preloadedState,
        ...(tasks === undefined ? {} : { tasks }),
        preferences: mergePreferencesPreload(preloadedState.preferences),
        guide,
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
      preferences: loadPreferences(),
      guide: { open: false },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
