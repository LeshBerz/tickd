import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, settle, test } from "./fixtures.ts";

type StoredTask = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  notes?: string;
};

/** Write a payload into storage and let the app load it (no init script, so reloads keep app writes). */
async function seedStoredTasks(page: Page, version: 1 | 2, tasks: StoredTask[]) {
  await page.goto("/");
  await page.evaluate(
    ({ storageVersion, items }) => {
      const normalized =
        storageVersion === 2 ? items.map((item) => ({ ...item, notes: item.notes ?? "" })) : items;
      localStorage.setItem(
        "tickd:tasks",
        JSON.stringify({ version: storageVersion, tasks: normalized }),
      );
    },
    { storageVersion: version, items: tasks },
  );
  await page.reload();
}

function notesField(page: Page) {
  return page.getByRole("textbox", { name: "Notes" });
}

test("opens a task, keeps typed notes after a reload", async ({ page }) => {
  await seedStoredTasks(page, 2, [
    { id: "a", title: "Alpha", completed: false, createdAt: 1 },
    { id: "b", title: "Bravo", completed: false, createdAt: 2 },
  ]);

  await page.getByRole("button", { name: "Bravo", exact: true }).click();

  await expect(page).toHaveURL("/tasks/b");
  const notes = notesField(page);
  await expect(notes).toHaveValue("");
  await notes.fill("Remember the milk\nand call back");
  await expect(page.getByText("31 / 2000")).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL("/tasks/b");
  await expect(notesField(page)).toHaveValue("Remember the milk\nand call back");
  await expect(page.getByRole("heading", { level: 2, name: "Bravo" })).toBeVisible();
});

test("writes the notes into a version 2 payload", async ({ page }) => {
  await seedStoredTasks(page, 2, [{ id: "a", title: "Alpha", completed: false, createdAt: 1 }]);
  await page.goto("/tasks/a");

  await notesField(page).fill("Stored note");

  await expect
    .poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem("tickd:tasks"));
      if (raw === null) {
        return null;
      }
      const parsed = JSON.parse(raw) as {
        version: number;
        tasks: { notes?: string }[];
      };
      return { version: parsed.version, notes: parsed.tasks[0]?.notes };
    })
    .toEqual({ version: 2, notes: "Stored note" });
});

test("back to list returns to the filter route with the list visible", async ({ page }) => {
  await seedStoredTasks(page, 2, [
    { id: "a", title: "Alpha", completed: false, createdAt: 1 },
    { id: "b", title: "Bravo", completed: true, createdAt: 2 },
  ]);
  await page.goto("/completed");

  await page.getByRole("button", { name: "Bravo", exact: true }).click();
  await expect(page).toHaveURL("/completed/tasks/b");

  await page.getByRole("button", { name: "Back to list" }).click();

  await expect(page).toHaveURL("/completed");
  await expect(page.getByRole("heading", { level: 2, name: "Completed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bravo", exact: true })).toBeVisible();
});

test("redirects an unknown task id to its filter", async ({ page }) => {
  await seedStoredTasks(page, 2, [{ id: "a", title: "Alpha", completed: false, createdAt: 1 }]);
  await page.goto("/active/tasks/missing");

  await expect(page).toHaveURL("/active");
  await expect(page.getByRole("heading", { level: 2, name: "Active" })).toBeVisible();
});

test("opens a version 1 task without notes and keeps it after an edit", async ({ page }) => {
  await seedStoredTasks(page, 1, [
    { id: "legacy", title: "Legacy task", completed: false, createdAt: 1 },
  ]);
  await page.goto("/tasks/legacy");

  await expect(page.getByRole("heading", { level: 2, name: "Legacy task" })).toBeVisible();
  await expect(notesField(page)).toHaveValue("");

  await notesField(page).fill("Added later");

  await expect
    .poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem("tickd:tasks"));
      return raw === null ? 0 : (JSON.parse(raw) as { version: number }).version;
    })
    .toBe(2);

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Legacy task" })).toBeVisible();
  await expect(notesField(page)).toHaveValue("Added later");
});

test("keeps hotkeys working on a detail route", async ({ page }) => {
  await seedStoredTasks(page, 2, [
    { id: "a", title: "Alpha", completed: false, createdAt: 1 },
    { id: "b", title: "Bravo", completed: true, createdAt: 2 },
  ]);
  await page.goto("/completed/tasks/b");

  await page.getByRole("heading", { level: 2, name: "Completed" }).click();
  await page.keyboard.press("1");

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 2, name: "All tasks" })).toBeVisible();
});

test("has no detectable accessibility violations on a detail route", async ({ page }) => {
  await seedStoredTasks(page, 2, [
    { id: "a", title: "Alpha", completed: false, createdAt: 1, notes: "Existing note" },
    { id: "b", title: "Bravo", completed: true, createdAt: 2 },
  ]);

  for (const path of ["/tasks/a", "/completed/tasks/b"]) {
    await page.goto(path);
    // The list and the panel fade in; axe must judge the settled colours.
    await settle(page);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  }
});

test("grows the notes field with the text and stops at the cap", async ({ page }) => {
  await seedStoredTasks(page, 2, [{ id: "a", title: "Alpha", completed: false, createdAt: 1 }]);
  await page.goto("/tasks/a");

  const height = async () =>
    (await notesField(page).boundingBox())?.height ?? Number.POSITIVE_INFINITY;

  const start = await height();
  await notesField(page).fill("one\ntwo\nthree");
  const fewLines = await height();
  expect(fewLines).toBeGreaterThanOrEqual(start);

  await notesField(page).fill("line\n".repeat(80));
  const manyLines = await height();
  expect(manyLines).toBeGreaterThan(fewLines);

  await notesField(page).fill("line\n".repeat(400));
  const veryLong = await height();
  // Growth stops at the cap instead of pushing the panel and the page.
  // Sub-pixel layout rounding makes the two measurements differ by a fraction of a pixel.
  expect(Math.abs(veryLong - manyLines)).toBeLessThan(1);
  // The counter is the only caption under the field: no extra explanations.
  await expect(page.getByText("2000 / 2000")).toBeVisible();
  await expect(page.locator("textarea")).toHaveCSS("max-height", "420px");

  // The capped field keeps its own scrollbar, so the whole note stays reachable.
  await expect
    .poll(async () => notesField(page).evaluate((el) => el.scrollHeight > el.clientHeight))
    .toBe(true);
});
