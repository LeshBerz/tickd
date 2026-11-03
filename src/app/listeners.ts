import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveTasks } from "../features/tasks/storage.ts";
import type { AppDispatch, RootState } from "./store.ts";

export const listenerMiddleware = createListenerMiddleware();

export const startAppListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

startAppListening({
  predicate: (_action, currentState, previousState) =>
    currentState.tasks.items !== previousState.tasks.items,
  effect: (_action, listenerApi) => {
    saveTasks(listenerApi.getState().tasks.items);
  },
});
