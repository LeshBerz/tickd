# 0006. React Compiler instead of manual memoization

- Status: Accepted
- Date: 2026-11-02

## Context

- React 19 components re-render on every parent render.
- Manual `useMemo`, `useCallback` and `memo` add noise and are easy to get wrong (stale dependencies).
- React Compiler 1.0 is stable and memoizes automatically at build time.

## Decision

- Enable React Compiler 1.0 for the whole app through Babel: `@vitejs/plugin-react` 6 with `reactCompilerPreset()` passed to `@rolldown/plugin-babel`.
- Dev dependencies required: `babel-plugin-react-compiler` and `@babel/core`. `@babel/core` stays on 7.x because the compiler is built against `@babel/types` 7.
- Code does not use `useMemo`, `useCallback` or `memo` by default.
- Redux selectors that allocate still use `createSelector`. Selector memoization is about store subscriptions, not rendering, so the compiler does not replace it.

## Alternatives considered

- **Manual memoization.** Explicit, but noisy and error-prone.
- **Experimental Rust port of the compiler** (`oxc-transform-react` via `react({ compiler: true })`). Faster builds, but marked experimental in the plugin docs. Revisit when it becomes stable.
- **No memoization at all.** Fine for a small app, but the compiler has no runtime cost and keeps the codebase free of manual optimizations as it grows.

## Consequences

- Positive: cleaner components without memoization boilerplate.
- Negative: Babel runs on app code, so builds are slightly slower than a pure oxc pipeline.
- Negative: components must follow the Rules of React (pure render, no mutation of props or state). Otherwise the compiler skips them.
- Negative: memoization is verified with the React DevTools "Memo ✨" badge rather than by reading code.
