import { describe, expect, test } from "vitest";
import { FILTERS, filterFromPath, filterPaths } from "./filter.ts";

test("FILTERS contains all supported filters in order", () => {
  expect(FILTERS).toEqual(["all", "active", "completed"]);
});

test("filterPaths maps every filter to its route", () => {
  expect(filterPaths).toEqual({
    all: "/",
    active: "/active",
    completed: "/completed",
  });
});

describe("filterFromPath", () => {
  test.each([
    ["/", "all"],
    ["/active", "active"],
    ["/active/", "active"],
    ["/completed", "completed"],
    ["/completed/", "completed"],
  ] as const)("maps %s to %s", (pathname, filter) => {
    expect(filterFromPath(pathname)).toBe(filter);
  });

  test.each(["", "/Active", "/foo", "/active/x", "/all"])("returns null for %j", (pathname) => {
    expect(filterFromPath(pathname)).toBeNull();
  });

  test("round-trips every filter through its path", () => {
    for (const filter of FILTERS) {
      expect(filterFromPath(filterPaths[filter])).toBe(filter);
    }
  });
});
