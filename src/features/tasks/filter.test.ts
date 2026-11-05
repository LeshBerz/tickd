import { describe, expect, test } from "vitest";
import { FILTERS, filterFromPath, filterPaths, taskIdFromPath, taskPath } from "./filter.ts";

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
    ["/tasks/abc", "all"],
    ["/tasks/abc/", "all"],
    ["/active/tasks/abc", "active"],
    ["/active/tasks/abc/", "active"],
    ["/completed/tasks/abc", "completed"],
    ["/completed/tasks/abc/", "completed"],
  ] as const)("maps %s to %s", (pathname, filter) => {
    expect(filterFromPath(pathname)).toBe(filter);
  });

  test.each([
    "",
    "/Active",
    "/foo",
    "/active/x",
    "/all",
    "/tasks/",
    "/tasks/a/b",
    "/Active/tasks/abc",
    "/tasks/abc/tasks/def",
    "/tasks/%E0%A4%A",
  ])("returns null for %j", (pathname) => {
    expect(filterFromPath(pathname)).toBeNull();
  });

  test("round-trips every filter through its path", () => {
    for (const filter of FILTERS) {
      expect(filterFromPath(filterPaths[filter])).toBe(filter);
    }
  });
});

describe("taskPath", () => {
  test.each([
    ["all", "abc", "/tasks/abc"],
    ["active", "abc", "/active/tasks/abc"],
    ["completed", "abc", "/completed/tasks/abc"],
  ] as const)("builds the %s detail path for %s", (filter, id, path) => {
    expect(taskPath(filter, id)).toBe(path);
  });

  test("encodes the id segment", () => {
    expect(taskPath("active", "a b/c")).toBe("/active/tasks/a%20b%2Fc");
    expect(taskPath("all", "100%")).toBe("/tasks/100%25");
  });

  test("round-trips every filter and a tricky id", () => {
    for (const filter of FILTERS) {
      const path = taskPath(filter, "id with/space%");
      expect(taskIdFromPath(path)).toBe("id with/space%");
      expect(filterFromPath(path)).toBe(filter);
    }
  });
});

describe("taskIdFromPath", () => {
  test.each([
    ["/tasks/abc", "abc"],
    ["/tasks/abc/", "abc"],
    ["/active/tasks/abc", "abc"],
    ["/completed/tasks/abc/", "abc"],
    ["/tasks/a-b_c.1", "a-b_c.1"],
  ] as const)("extracts the id from %s", (pathname, id) => {
    expect(taskIdFromPath(pathname)).toBe(id);
  });

  test("decodes a percent-encoded id", () => {
    expect(taskIdFromPath("/tasks/a%20b")).toBe("a b");
    expect(taskIdFromPath("/active/tasks/%D0%BC%D0%B5%D1%82%D0%BA%D0%B0")).toBe("метка");
  });

  test.each([
    "/",
    "/active",
    "/completed/",
    "/tasks/",
    "/active/tasks/",
    "/tasks/a/b",
    "/Active/tasks/abc",
    "/foo/tasks/abc",
    "/tasks/%E0%A4%A",
  ])("returns null for %j", (pathname) => {
    expect(taskIdFromPath(pathname)).toBeNull();
  });
});
