import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store.ts";
import type { Filter } from "./filter.ts";
import type { Task } from "./schema.ts";

export const selectTasks = (state: RootState): Task[] => state.tasks.items;

export const selectVisibleTasks = createSelector(
  [selectTasks, (_state: RootState, filter: Filter) => filter],
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
