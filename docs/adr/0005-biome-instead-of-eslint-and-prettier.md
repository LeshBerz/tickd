# 0005. Biome instead of ESLint and Prettier

- Status: Accepted
- Date: 2026-11-02

## Context

- The project needs linting, formatting and import sorting with a fast, low-config setup.
- TypeScript 7.0 (native compiler) is used. Its npm package no longer exposes the classic JavaScript compiler API that typescript-eslint relies on for type-aware rules.

## Decision

- Use Biome 2.6 as the single tool for linting, formatting and import organizing.
- `npm run lint` runs `biome check .`.
- `npm run format` runs `biome check --write .`.
- Enable the recommended rule set (which includes the a11y rules) plus the `react` and `test` domains.
- Configuration lives in `biome.json`.

## Alternatives considered

- **ESLint + typescript-eslint + Prettier.** Largest rule ecosystem, including type-aware rules and `eslint-plugin-react-compiler` / `react-hooks`. Rejected: three tools and several plugins to configure and keep compatible, slower runs, and type-aware linting would require a second TypeScript installation alongside TypeScript 7.
- **oxlint + Prettier.** Fast linting, but still two tools to configure and run.

## Consequences

- Positive: one dependency, one config file.
- Positive: very fast checks in CI and in the editor.
- Negative: fewer rules than the ESLint ecosystem.
- Negative: no type-aware lint rules. Type safety is enforced by `tsc` in strict mode instead.
- Negative: some React-specific rules (for example, rules of hooks relevant to the compiler) come from Biome's own implementations and may differ from the ESLint plugins.
