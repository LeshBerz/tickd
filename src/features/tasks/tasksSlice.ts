import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Task } from "./schema.ts";

export type TasksState = { items: Task[] };
export const initialState: TasksState = { items: [] };

export const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    add: {
      reducer(state, action: PayloadAction<Task>) {
        if (action.payload.title.trim() === "") {
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
  },
});

export const { add, toggle, remove } = tasksSlice.actions;
