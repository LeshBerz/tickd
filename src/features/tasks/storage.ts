import { CURRENT_STORAGE_VERSION, parseStoredTasks, type Task } from "./schema.ts";

export const TASKS_STORAGE_KEY = "tickd:tasks";

export type LoadTasksResult = {
  tasks: Task[];
  /** false when localStorage cannot be read/written (probe failed). */
  available: boolean;
  /** true when a stored value existed but JSON/schema/migrate failed. */
  discarded: boolean;
};

export type SaveResult = "ok" | "quota" | "unavailable";

function warnReadFailure(): void {
  if (import.meta.env.DEV) {
    console.warn("Failed to read tasks from localStorage");
  }
}

function warnWriteFailure(): void {
  if (import.meta.env.DEV) {
    console.warn("Failed to write tasks to localStorage");
  }
}

function isQuotaError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return true;
  }
  if (error instanceof Error && error.name === "QuotaExceededError") {
    return true;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: number }).code;
    return code === 22 || code === 1014;
  }
  return false;
}

/** Confirm writes work without introducing a second key (quota-safe). */
function probeWritable(raw: string | null): boolean {
  try {
    if (raw !== null) {
      localStorage.setItem(TASKS_STORAGE_KEY, raw);
      return true;
    }
    const empty = JSON.stringify({ version: CURRENT_STORAGE_VERSION, tasks: [] });
    localStorage.setItem(TASKS_STORAGE_KEY, empty);
    localStorage.removeItem(TASKS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadTasks(): LoadTasksResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(TASKS_STORAGE_KEY);
  } catch {
    warnReadFailure();
    return { tasks: [], available: false, discarded: false };
  }

  let tasks: Task[] = [];
  let discarded = false;

  if (raw !== null) {
    try {
      const parsed = parseStoredTasks(JSON.parse(raw));
      if (parsed !== null) {
        tasks = parsed;
      } else {
        discarded = true;
        warnReadFailure();
      }
    } catch {
      discarded = true;
      warnReadFailure();
    }
  }

  if (!probeWritable(raw)) {
    warnWriteFailure();
    return { tasks, available: false, discarded };
  }

  return { tasks, available: true, discarded };
}

export function saveTasks(tasks: readonly Task[]): SaveResult {
  try {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify({ version: CURRENT_STORAGE_VERSION, tasks }),
    );
    return "ok";
  } catch (error) {
    warnWriteFailure();
    if (isQuotaError(error)) {
      return "quota";
    }
    return "unavailable";
  }
}
