# 0003. Versioned storage schema with Valibot and migrations

- Status: Accepted
- Date: 2026-11-03

## Context

- localStorage is untrusted input: manual edits, older app versions, other tabs and partial writes can all produce unexpected data.
- The format will change. The planned lists module adds `listId` to tasks.
- Corrupted data must never crash the app.

## Decision

- Store tasks under the key `tickd:tasks` with the payload `{ version: 1, tasks: Task[] }`.
- Define `TaskSchema` in Valibot:
  - `id`: non-empty string.
  - `title`: trimmed, non-empty string.
  - `completed`: boolean.
  - `createdAt`: non-negative integer.
- The `Task` type is inferred from the schema (`v.InferOutput`), so the type and the validation cannot drift.
- The legacy v0 format is a bare `Task[]` array. `parseStoredTasks` validates the input against the union of v0 and v1, and `migrate()` lifts v0 to v1.
- Loading is all-or-nothing. `loadTasks()` returns an empty list (with a `console.warn` in development) and never throws if:
  - any task is invalid,
  - the version is unknown,
  - the JSON is invalid,
  - or storage throws.
- Reading never writes. Corrupted data stays in storage until the first real change, which overwrites it with a valid v1 payload.
- `saveTasks` writes `{ version: 1, tasks }` and swallows storage errors (quota exceeded, storage disabled).
- Unknown keys are stripped.

## Alternatives considered

- **No validation, `JSON.parse` plus a cast.** Crashes on bad data and the types lie.
- **Zod.** Larger bundle. Valibot is modular and tree-shakable.
- **Per-item salvage that drops only invalid tasks.** More resilient, but needs more code and tests. Rejected for now in favor of predictable behavior.
- **A separate version key in storage.** Needs two writes and can go out of sync with the data.

## Consequences

- Positive: startup is safe with any stored value.
- Positive: adding v2 means a new schema, one `migrate` step and a test.
- Negative: one bad task drops the whole list on load, and the first change then overwrites the stored data. This trade-off is accepted.
- Negative: data written by a newer app version (unknown version) is treated as invalid by an older tab.
