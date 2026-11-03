import * as v from "valibot";

export const TaskSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  title: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  completed: v.boolean(),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
export type Task = v.InferOutput<typeof TaskSchema>;

export const StoredTasksV0Schema = v.array(TaskSchema);
export const StoredTasksV1Schema = v.object({
  version: v.literal(1),
  tasks: v.array(TaskSchema),
});
export const CURRENT_STORAGE_VERSION = 1;

export type StoredTasksV0 = v.InferOutput<typeof StoredTasksV0Schema>;
export type StoredTasksV1 = v.InferOutput<typeof StoredTasksV1Schema>;

const StoredTasksSchema = v.union([StoredTasksV0Schema, StoredTasksV1Schema]);

export function migrate(data: StoredTasksV0 | StoredTasksV1): StoredTasksV1 {
  if (Array.isArray(data)) {
    return { version: CURRENT_STORAGE_VERSION, tasks: data };
  }
  return data;
}

export function parseStoredTasks(raw: unknown): Task[] | null {
  const result = v.safeParse(StoredTasksSchema, raw);
  if (!result.success) {
    return null;
  }
  return migrate(result.output).tasks;
}
