import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Task } from "./schema.ts";
import { TITLE_MAX_LENGTH } from "./title.ts";

export type TasksState = { items: Task[] };
export const initialState: TasksState = { items: [] };

export const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    add: {
      reducer(state, action: PayloadAction<Task>) {
        const title = action.payload.title;
        if (title.trim() === "" || title.length > TITLE_MAX_LENGTH) {
          return;
        }
        state.items.push(action.payload);
      },
      prepare(title: string) {
        return {
          payload: {
            id: crypto.randomUUID(),
            title: title.trim(),
            completed: false,
            createdAt: Date.now(),
          },
        };
      },
    },
    toggle(state, action: PayloadAction<string>) {
      const task = state.items.find((item) => item.id === action.payload);
      if (!task) {
        return;
      }
      task.completed = !task.completed;
    },
    remove(state, action: PayloadAction<string>) {
      const index = state.items.findIndex((item) => item.id === action.payload);
      if (index === -1) {
        return;
      }
      state.items.splice(index, 1);
    },
    clearCompleted(state) {
      if (!state.items.some((task) => task.completed)) {
        return;
      }
      state.items = state.items.filter((task) => !task.completed);
    },
    updateTitle: {
      reducer(state, action: PayloadAction<{ id: string; title: string }>) {
        const title = action.payload.title;
        if (title === "" || title.length > TITLE_MAX_LENGTH) {
          return;
        }
        const task = state.items.find((item) => item.id === action.payload.id);
        if (!task || task.title === title) {
          return;
        }
        task.title = title;
      },
      prepare(id: string, title: string) {
        return { payload: { id, title: title.trim() } };
      },
    },
  },
});

export const { add, toggle, remove, clearCompleted, updateTitle } = tasksSlice.actions;
