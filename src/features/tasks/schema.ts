import * as v from "valibot";
import { NOTES_MAX_LENGTH } from "./notes.ts";
import { TITLE_MAX_LENGTH } from "./title.ts";

const taskIdentityFields = {
  id: v.pipe(v.string(), v.nonEmpty()),
  title: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(TITLE_MAX_LENGTH)),
  completed: v.boolean(),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
};

/** Tasks stored by versions 0 and 1 — no `notes` field yet. */
export const LegacyTaskSchema = v.object(taskIdentityFields);
export type LegacyTask = v.InferOutput<typeof LegacyTaskSchema>;

export const TaskSchema = v.object({
  ...taskIdentityFields,
  notes: v.pipe(v.string(), v.maxLength(NOTES_MAX_LENGTH)),
});
export type Task = v.InferOutput<typeof TaskSchema>;

export const StoredTasksV0Schema = v.array(LegacyTaskSchema);
export const StoredTasksV1Schema = v.object({
  version: v.literal(1),
  tasks: v.array(LegacyTaskSchema),
});
export const StoredTasksV2Schema = v.object({
  version: v.literal(2),
  tasks: v.array(TaskSchema),
});
export const CURRENT_STORAGE_VERSION = 2;

export type StoredTasksV0 = v.InferOutput<typeof StoredTasksV0Schema>;
export type StoredTasksV1 = v.InferOutput<typeof StoredTasksV1Schema>;
export type StoredTasksV2 = v.InferOutput<typeof StoredTasksV2Schema>;
export type StoredTasks = StoredTasksV0 | StoredTasksV1 | StoredTasksV2;

const StoredTasksSchema = v.union([StoredTasksV0Schema, StoredTasksV1Schema, StoredTasksV2Schema]);

function migrateV1ToV2(data: StoredTasksV1): StoredTasksV2 {
  return {
    version: CURRENT_STORAGE_VERSION,
    tasks: data.tasks.map((task) => ({ ...task, notes: "" })),
  };
}

/** Migrate any supported payload to the current version without mutating the input. */
export function migrate(data: StoredTasks): StoredTasksV2 {
  if (Array.isArray(data)) {
    return migrateV1ToV2({ version: 1, tasks: data });
  }
  if (data.version === 1) {
    return migrateV1ToV2(data);
  }
  return { version: CURRENT_STORAGE_VERSION, tasks: data.tasks };
}

export function parseStoredTasks(raw: unknown): Task[] | null {
  const result = v.safeParse(StoredTasksSchema, raw);
  if (!result.success) {
    return null;
  }
  return migrate(result.output).tasks;
}
