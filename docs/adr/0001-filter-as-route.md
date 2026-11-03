# 0001. Filter is a route, not local state

- Status: Accepted
- Date: 2026-11-03

## Context

- The task list has three views: all, active and completed.
- The selected filter should survive a reload, be shareable as a link and work with browser back/forward.
- The app is deployed to GitHub Pages (see ADR 0004).

## Decision

- Map filters to routes: `/` is all, `/active` is active, `/completed` is completed.
- `src/features/tasks/filter.ts` holds the mapping:
  - `Filter` type and the `FILTERS` list.
  - `filterPaths` (filter → path).
  - `filterFromPath` (path → filter). It tolerates one trailing slash, is case-sensitive and returns `null` for unknown paths.
- The filter is not stored in Redux. Components derive the list with `selectVisibleTasks(state, filter)`.
- In the UI the filters are links (`NavLink` with `aria-current="page"`), not buttons.
- Unknown paths redirect to `/`.
- The router wiring lands together with the UI: `createBrowserRouter` with a `basename`, as described in ADR 0004.

## Alternatives considered

- **`useState` in a component.** Simplest, but the filter is lost on reload, cannot be linked to, and the back button does nothing.
- **Filter in the Redux store.** Duplicates the URL as a second source of truth and needs syncing between the two.
- **Query parameter (`?filter=active`).** Works, but gives less clean URLs, and the route already exists as a concept for future modules.

## Consequences

- Positive: shareable URLs and working browser history.
- Positive: the store holds only domain data.
- Negative: depends on the GitHub Pages 404 redirect (ADR 0004).
- Negative: filter changes are navigations, so tests that render filtered views need a router.
