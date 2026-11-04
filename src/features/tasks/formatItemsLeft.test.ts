import { describe, expect, test } from "vitest";
import { formatItemsLeft } from "./formatItemsLeft.ts";

describe("formatItemsLeft", () => {
  test("formats zero tasks as a plural", () => {
    expect(formatItemsLeft(0)).toBe("0 items left");
  });

  test("formats one task as a singular", () => {
    expect(formatItemsLeft(1)).toBe("1 item left");
  });

  test("formats two tasks as a plural", () => {
    expect(formatItemsLeft(2)).toBe("2 items left");
  });
});
