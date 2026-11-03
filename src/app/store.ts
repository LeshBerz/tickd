import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { loadTasks } from "../features/tasks/storage.ts";
import { tasksSlice } from "../features/tasks/tasksSlice.ts";
import { listenerMiddleware } from "./listeners.ts";

export const rootReducer = combineSlices(tasksSlice);

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState: Partial<RootState> = { tasks: { items: loadTasks() } }) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
