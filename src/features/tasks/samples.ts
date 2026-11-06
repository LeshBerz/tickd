import type { Task } from "./schema.ts";
import { TITLE_MAX_LENGTH } from "./title.ts";

export type SampleTaskKey = "plan" | "walk" | "message";

/** Order of the three starter tasks; the keys double as translation suffixes. */
export const SAMPLE_TASK_KEYS: readonly SampleTaskKey[] = ["plan", "walk", "message"];

/** Stable ids make repeated activation detectable instead of creating duplicates. */
export function sampleTaskId(key: SampleTaskKey): string {
  return `sample-${key}`;
}

/**
 * Builds the starter tasks from already translated titles. All three are active,
 * have empty notes and pass the storage schema; ids stay stable for de-duplication.
 */
export function createSampleTasks(
  titles: Readonly<Record<SampleTaskKey, string>>,
  now: number,
): Task[] {
  return SAMPLE_TASK_KEYS.map((key, index) => {
    const trimmed = titles[key].trim().slice(0, TITLE_MAX_LENGTH);
    return {
      id: sampleTaskId(key),
      title: trimmed === "" ? titles[key] : trimmed,
      completed: false,
      createdAt: now + index,
      notes: "",
    };
  });
}

/**
 * True when the sample set is present. Samples are matched by their stable ids, so
 * renaming one never re-enables the button and hand-written look-alikes do not either.
 */
export function hasAllSamples(tasks: readonly Task[]): boolean {
  return SAMPLE_TASK_KEYS.every((key) => tasks.some((task) => task.id === sampleTaskId(key)));
}
