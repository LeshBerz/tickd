import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store.ts";
import type { Filter } from "./filter.ts";
import { hasAllSamples } from "./samples.ts";
import type { Task } from "./schema.ts";

type TasksSelectorState = Pick<RootState, "tasks">;

export const selectTasks = (state: TasksSelectorState): Task[] => state.tasks.items;

export const selectTaskById = (state: TasksSelectorState, id: string): Task | null =>
  state.tasks.items.find((task) => task.id === id) ?? null;

export const selectVisibleTasks = createSelector(
  [selectTasks, (_state: TasksSelectorState, filter: Filter) => filter],
  (items, filter): Task[] => {
    switch (filter) {
      case "all":
        return items;
      case "active":
        return items.filter((task) => !task.completed);
      case "completed":
        return items.filter((task) => task.completed);
    }
  },
);

export const selectTaskCounts = createSelector([selectTasks], (items) => ({
  all: items.length,
  active: items.filter((task) => !task.completed).length,
  completed: items.filter((task) => task.completed).length,
}));

/** The sample button is hidden once the starter set is present. */
export const selectHasSampleTasks = createSelector([selectTasks], (items) => hasAllSamples(items));
