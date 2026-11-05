import { afterEach, describe, expect, test } from "vitest";
import { applyLanguage } from "../../i18n/index.ts";
import { formatItemsLeft } from "./formatItemsLeft.ts";

afterEach(() => {
  applyLanguage("en");
});

describe("formatItemsLeft", () => {
  test.each([
    [0, "0 items left"],
    [1, "1 item left"],
    [2, "2 items left"],
    [5, "5 items left"],
  ])("formats %i in English as %s", (count, expected) => {
    expect(formatItemsLeft(count)).toBe(expected);
  });

  test.each([
    [1, "Осталась 1 задача"],
    [2, "Осталось 2 задачи"],
    [4, "Осталось 4 задачи"],
    [5, "Осталось 5 задач"],
    [11, "Осталось 11 задач"],
    [21, "Осталась 21 задача"],
    [0, "Осталось 0 задач"],
  ])("uses the Russian plural form for %i", (count, expected) => {
    applyLanguage("ru");

    expect(formatItemsLeft(count)).toBe(expected);
  });
});
