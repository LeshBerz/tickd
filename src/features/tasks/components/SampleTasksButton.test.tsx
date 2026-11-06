import { screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { makeStore } from "../../../app/store.ts";
import { renderApp } from "../../../test/renderApp.tsx";
import { SAMPLE_TASK_KEYS } from "../samples.ts";
import type { Task } from "../schema.ts";
import { addSamples } from "../tasksSlice.ts";

function task(id: string, title: string): Task {
  return { id, title, completed: false, createdAt: Number(id), notes: "" };
}

const sampleTitles = [
  "Plan tomorrow's top three tasks",
  "Take a 20-minute walk",
  "Message a friend",
];

function loadButton(): HTMLElement {
  return screen.getByRole("button", { name: "Load sample tasks" });
}

describe("sample tasks", () => {
  test("offers the action in the global empty state only", () => {
    renderApp({ tasks: [] });

    expect(loadButton()).toBeInTheDocument();
    expect(screen.getByText("All caught up!")).toBeInTheDocument();
  });

  test("is hidden when tasks already exist", () => {
    renderApp({ tasks: [task("1", "Existing")] });

    expect(screen.queryByRole("button", { name: "Load sample tasks" })).not.toBeInTheDocument();
  });

  test("adds three active tasks with notes through the domain", async () => {
    const { store, user } = renderApp({ tasks: [] });

    await user.click(loadButton());

    const items = store.getState().tasks.items;
    expect(items.map((item) => item.title)).toEqual(sampleTitles);
    expect(items.every((item) => item.completed === false)).toBe(true);
    expect(items.every((item) => item.notes === "")).toBe(true);
    expect(items.map((item) => item.id)).toEqual(["sample-plan", "sample-walk", "sample-message"]);

    const list = screen.getByRole("list");
    for (const title of sampleTitles) {
      expect(within(list).getByText(title)).toBeInTheDocument();
    }
  });

  test("persists the samples through the task listener", async () => {
    const { user } = renderApp({ tasks: [] });

    await user.click(loadButton());

    const stored = JSON.parse(localStorage.getItem("tickd:tasks") ?? "null");
    expect(stored).toMatchObject({ version: 2 });
    expect(stored.tasks.map((item: Task) => item.title)).toEqual(sampleTitles);
    expect(stored.tasks[0]).toMatchObject({ id: "sample-plan", completed: false, notes: "" });
  });

  test("appends to existing tasks without replacing them", () => {
    const existing = task("mine", "My own task");
    const store = makeStore({ tasks: { items: [existing] } });

    store.dispatch(addSamples({ plan: "Plan", walk: "Walk", message: "Message" }, 10));

    const items = store.getState().tasks.items;
    expect(items).toHaveLength(4);
    expect(items[0]).toBe(existing);
    expect(items.slice(1).map((item) => item.title)).toEqual(["Plan", "Walk", "Message"]);
  });

  test("an existing task with a sample id keeps its own data", () => {
    const existing = { ...task("sample-plan", "My planned title"), completed: true };
    const store = makeStore({ tasks: { items: [existing] } });

    store.dispatch(addSamples({ plan: "Plan", walk: "Walk", message: "Message" }, 10));

    const items = store.getState().tasks.items;
    expect(items[0]).toBe(existing);
    expect(items.map((item) => item.id)).toEqual(["sample-plan", "sample-walk", "sample-message"]);
  });

  test("the button disappears after loading and a repeated action adds nothing", async () => {
    const { store, user } = renderApp({ tasks: [] });

    await user.click(loadButton());

    expect(screen.queryByRole("button", { name: "Load sample tasks" })).not.toBeInTheDocument();
    const items = store.getState().tasks.items;
    expect(items).toHaveLength(SAMPLE_TASK_KEYS.length);

    // A second dispatch after the samples exist must keep the state reference.
    store.dispatch(addSamples({ plan: "Plan", walk: "Walk", message: "Message" }, 10));

    expect(store.getState().tasks.items).toBe(items);
  });

  test("uses localized titles in Russian", async () => {
    const { store, user } = renderApp({ tasks: [], preferences: { language: "ru" } });

    await user.click(screen.getByRole("button", { name: "Загрузить примеры задач" }));

    expect(store.getState().tasks.items.map((item) => item.title)).toEqual([
      "Спланировать три главные задачи на завтра",
      "Прогуляться 20 минут",
      "Написать другу",
    ]);
    expect(screen.getByText("Прогуляться 20 минут")).toBeInTheDocument();
  });

  test("is offered in the empty filter views too", () => {
    renderApp({ path: "/active", tasks: [] });

    expect(loadButton()).toBeInTheDocument();
  });
});
