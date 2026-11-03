import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { loadTasks } from "../features/tasks/storage.ts";
import { tasksSlice } from "../features/tasks/tasksSlice.ts";
import { listenerMiddleware } from "./listeners.ts";
import { persistenceSlice } from "./persistenceSlice.ts";

export const rootReducer = combineSlices(tasksSlice, persistenceSlice);

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  if (preloadedState !== undefined) {
    return configureStore({
      reducer: rootReducer,
      preloadedState,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(listenerMiddleware.middleware),
    });
  }

  const loaded = loadTasks();
  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      tasks: { items: loaded.tasks },
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
