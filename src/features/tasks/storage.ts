import { CURRENT_STORAGE_VERSION, parseStoredTasks, type Task } from "./schema.ts";

export const TASKS_STORAGE_KEY = "tickd:tasks";

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const tasks = parseStoredTasks(JSON.parse(raw));
    if (tasks !== null) {
      return tasks;
    }
  } catch {
    // Invalid JSON or inaccessible storage: fall through to the empty list.
  }
  if (import.meta.env.DEV) {
    console.warn("Failed to read tasks from localStorage");
  }
  return [];
}

export function saveTasks(tasks: readonly Task[]): void {
  try {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify({ version: CURRENT_STORAGE_VERSION, tasks }),
    );
  } catch {
    if (import.meta.env.DEV) {
      console.warn("Failed to write tasks to localStorage");
    }
  }
}
