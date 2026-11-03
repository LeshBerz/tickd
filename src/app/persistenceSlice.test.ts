import { expect, test } from "vitest";
import { persistenceSlice } from "./persistenceSlice.ts";

type PersistenceState = ReturnType<typeof persistenceSlice.getInitialState>;

const { dismissAvailability, dismissLoadDiscarded, dismissSaveError, reportSaveError } =
  persistenceSlice.actions;

function state(overrides: Partial<PersistenceState> = {}): PersistenceState {
  return { ...persistenceSlice.getInitialState(), ...overrides };
}

test("uses persistence as the state key", () => {
  expect(persistenceSlice.reducerPath).toBe("persistence");
});

test("starts available with no storage notices", () => {
  expect(persistenceSlice.getInitialState()).toEqual({
    available: true,
    loadDiscarded: false,
    saveError: null,
    availabilityDismissed: false,
  });
});

test("records a quota save error without changing other flags", () => {
  const start = state({ loadDiscarded: true });

  expect(persistenceSlice.reducer(start, reportSaveError("quota"))).toEqual({
    ...start,
    saveError: "quota",
  });
});

test("records an unavailable save error", () => {
  expect(persistenceSlice.reducer(state(), reportSaveError("unavailable"))).toEqual(
    state({ saveError: "unavailable" }),
  );
});

test("replaces an existing save error", () => {
  expect(
    persistenceSlice.reducer(state({ saveError: "quota" }), reportSaveError("unavailable"))
      .saveError,
  ).toBe("unavailable");
});

test("dismisses only the save error", () => {
  const start = state({
    available: false,
    loadDiscarded: true,
    saveError: "quota",
  });

  expect(persistenceSlice.reducer(start, dismissSaveError())).toEqual({
    ...start,
    saveError: null,
  });
});

test("dismisses only a discarded load", () => {
  const start = state({
    available: false,
    loadDiscarded: true,
    saveError: "unavailable",
  });

  expect(persistenceSlice.reducer(start, dismissLoadDiscarded())).toEqual({
    ...start,
    loadDiscarded: false,
  });
});

test("dismisses the unavailable notice without marking storage available", () => {
  const start = state({ available: false });

  expect(persistenceSlice.reducer(start, dismissAvailability())).toEqual({
    ...start,
    availabilityDismissed: true,
  });
});
