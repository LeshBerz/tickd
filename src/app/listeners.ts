import { createListenerMiddleware } from "@reduxjs/toolkit";
import { savePreferences } from "../features/preferences/storage.ts";
import { saveTasks } from "../features/tasks/storage.ts";
import { clearSaveError, reportSaveError } from "./persistenceSlice.ts";
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
    const state = listenerApi.getState();
    // Do not attempt writes when the load-time probe already failed (private mode).
    // Avoids reclassifying a blocked store as "quota" on the first user change.
    if (!state.persistence.available) {
      return;
    }
    const result = saveTasks(state.tasks.items);
    if (result === "ok") {
      listenerApi.dispatch(clearSaveError());
      return;
    }
    listenerApi.dispatch(reportSaveError(result === "quota" ? "quota" : "unavailable"));
  },
});

/**
 * Preferences live under their own key and never touch task persistence:
 * a failing preference write must not raise task storage errors.
 */
startAppListening({
  predicate: (_action, currentState, previousState) =>
    currentState.preferences !== previousState.preferences,
  effect: (_action, listenerApi) => {
    savePreferences(listenerApi.getState().preferences);
  },
});
