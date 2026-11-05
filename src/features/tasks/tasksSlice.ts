import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { NOTES_MAX_LENGTH } from "./notes.ts";
import type { Task } from "./schema.ts";
import { TITLE_MAX_LENGTH } from "./title.ts";

export type LastRemoved = { task: Task; index: number };
export type TasksState = { items: Task[]; lastRemoved: LastRemoved | null };
export const initialState: TasksState = { items: [], lastRemoved: null };

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
            notes: "",
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
      const task = state.items[index];
      if (task === undefined) {
        return;
      }
      state.lastRemoved = { task, index };
      state.items.splice(index, 1);
    },
    restore(state) {
      const snapshot = state.lastRemoved;
      if (snapshot == null) {
        return;
      }
      if (state.items.some((item) => item.id === snapshot.task.id)) {
        state.lastRemoved = null;
        return;
      }
      const insertAt = Math.min(snapshot.index, state.items.length);
      state.items.splice(insertAt, 0, snapshot.task);
      state.lastRemoved = null;
    },
    clearLastRemoved(state) {
      if (state.lastRemoved == null) {
        return;
      }
      state.lastRemoved = null;
    },
    clearCompleted(state) {
      const hasCompleted = state.items.some((task) => task.completed);
      const hadSnapshot = state.lastRemoved !== null;

      if (!hasCompleted && !hadSnapshot) {
        return;
      }

      if (hasCompleted) {
        state.items = state.items.filter((task) => !task.completed);
      }

      if (hadSnapshot) {
        state.lastRemoved = null;
      }
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
    updateNotes: {
      reducer(state, action: PayloadAction<{ id: string; notes: string }>) {
        const notes = action.payload.notes;
        if (notes.length > NOTES_MAX_LENGTH) {
          return;
        }
        const task = state.items.find((item) => item.id === action.payload.id);
        if (!task || task.notes === notes) {
          return;
        }
        task.notes = notes;
      },
      prepare(id: string, notes: string) {
        return { payload: { id, notes } };
      },
    },
  },
});

export const {
  add,
  toggle,
  remove,
  restore,
  clearLastRemoved,
  clearCompleted,
  updateTitle,
  updateNotes,
} = tasksSlice.actions;
