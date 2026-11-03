# 0002. Redux Toolkit with listener middleware for persistence

- Status: Accepted
- Date: 2026-11-03

## Context

- The state is small now, but planned extensions (undo, cross-tab sync, reorder, a lists module) need predictable updates, derived data and side effects outside components.
- React Compiler is enabled (ADR 0006), so derived data goes through memoized selectors (`createSelector`).

## Decision

- Use a Redux Toolkit slice `tasks` with the state `{ items: Task[] }` and the actions `add`, `toggle` and `remove`.
- `add` has a `prepare` callback that trims the title and generates `id` (`crypto.randomUUID()`) and `createdAt` (`Date.now()`). The reducer also ignores empty or whitespace-only titles, even if `prepare` is bypassed.
- New tasks are appended. Array order is display order.
- The store is created by `makeStore(preloadedState?)`:
  - There is no module-level singleton.
  - By default it preloads tasks from localStorage.
  - `src/main.tsx` creates it once and passes it to `Provider`. Tests create a fresh store each.
- Typed hooks `useAppDispatch` and `useAppSelector` are built with `withTypes`.
- Persistence is a single listener in `src/app/listeners.ts`. Its predicate is `current.tasks.items !== previous.tasks.items`, and its effect calls `saveTasks`.
- Consequences of the predicate:
  - Any real change is saved, regardless of which action caused it.
  - No-op actions (unknown id, empty title) never write, because Immer keeps the same reference.
  - Creating the store never writes.

## Alternatives considered

- **React context + `useReducer`.** Fine for this size, but has no middleware for side effects. Persistence in `useEffect` mixes concerns, and the approach scales worse for the planned extensions.
- **Zustand.** Smaller, but adds a dependency and gives less structure around side effects. Redux Toolkit is already part of the stack.
- **`redux-persist`.** Adds a dependency, uses an opaque storage format and makes versioning and migrations harder (see ADR 0003).
- **Listener on an explicit list of action types.** Every new action must be remembered. The state-reference predicate cannot forget.

## Consequences

- Positive: side effects are isolated and testable through the real store; reducers stay pure.
- Positive: cross-tab sync (later) will add a `replaceAll` action excluded from the predicate, which avoids write-back loops.
- Negative: more boilerplate than a hook.
- Negative: Redux Toolkit's bundled type declarations fail full library type checking under `exactOptionalPropertyTypes`, so `tsconfig.app.json` sets `skipLibCheck: true`. Our own code is still checked with `exactOptionalPropertyTypes`.
