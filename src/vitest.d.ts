import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// jest-dom's own "vitest" entry augments the pre-v5 `Assertion<T>` signature, which conflicts
// with Vitest 5. Extending `Matchers<R, T>` is the augmentation point Vitest documents.
declare module "vitest" {
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<T, R> {}
}
