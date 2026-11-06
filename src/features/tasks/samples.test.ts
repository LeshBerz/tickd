import { describe, expect, test } from "vitest";
import { createSampleTasks, hasAllSamples, SAMPLE_TASK_KEYS, sampleTaskId } from "./samples.ts";
import { parseStoredTasks } from "./schema.ts";

const titles = {
  plan: "Plan tomorrow's top three tasks",
  walk: "Take a 20-minute walk",
  message: "Message a friend",
};

describe("createSampleTasks", () => {
  test("builds three active tasks with empty notes and stable ids", () => {
    const tasks = createSampleTasks(titles, 1000);

    expect(tasks).toHaveLength(3);
    expect(tasks.map((task) => task.id)).toEqual(["sample-plan", "sample-walk", "sample-message"]);
    expect(tasks.map((task) => task.title)).toEqual([titles.plan, titles.walk, titles.message]);
    expect(tasks.every((task) => task.completed === false)).toBe(true);
    expect(tasks.every((task) => task.notes === "")).toBe(true);
    expect(tasks.map((task) => task.createdAt)).toEqual([1000, 1001, 1002]);
  });

  test("every sample passes the storage schema", () => {
    expect(parseStoredTasks({ version: 2, tasks: createSampleTasks(titles, 1) })).toEqual(
      createSampleTasks(titles, 1),
    );
  });

  test("uses localized titles and trims them", () => {
    const tasks = createSampleTasks({ plan: "  План  ", walk: "Прогулка", message: "Друг" }, 5);

    expect(tasks.map((task) => task.title)).toEqual(["План", "Прогулка", "Друг"]);
  });

  test("clamps titles to the storage limit", () => {
    const long = "a".repeat(300);
    const [first] = createSampleTasks({ ...titles, plan: long }, 1);

    expect(first?.title).toHaveLength(200);
  });

  test("does not mutate the provided titles", () => {
    const input = { ...titles };
    createSampleTasks(input, 1);

    expect(input).toEqual(titles);
  });
});

describe("hasAllSamples", () => {
  test("is false for an empty list and for a partial set", () => {
    expect(hasAllSamples([])).toBe(false);
    expect(hasAllSamples(createSampleTasks(titles, 1).slice(0, 2))).toBe(false);
  });

  test("is true when the ids are present, even if the titles were renamed", () => {
    const tasks = createSampleTasks(titles, 1).map((task) => ({ ...task, title: "Renamed" }));

    expect(hasAllSamples(tasks)).toBe(true);
  });

  test("matches ids, not titles, so hand-written look-alikes do not disable the button", () => {
    const tasks = SAMPLE_TASK_KEYS.map((key) => ({
      id: `other-${key}`,
      title: titles[key],
      completed: false,
      createdAt: 1,
      notes: "",
    }));

    expect(hasAllSamples(tasks)).toBe(false);
    expect(sampleTaskId("plan")).toBe("sample-plan");
  });
});
