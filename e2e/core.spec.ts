import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, settle, test } from "./fixtures.ts";

type SeedTask = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  notes?: string;
};

async function seedTasks(page: Page, tasks: SeedTask[]) {
  await page.addInitScript((items) => {
    localStorage.setItem(
      "tickd:tasks",
      JSON.stringify({
        version: 2,
        tasks: items.map((item) => ({ ...item, notes: item.notes ?? "" })),
      }),
    );
  }, tasks);
}

/** Version 1 payload without a `notes` field — exercises the storage migration. */
async function seedLegacyTasks(
  page: Page,
  tasks: { id: string; title: string; completed: boolean; createdAt: number }[],
) {
  await page.addInitScript((items) => {
    localStorage.setItem("tickd:tasks", JSON.stringify({ version: 1, tasks: items }));
  }, tasks);
}

test("opens a task migrated from a version 1 payload with empty notes", async ({ page }) => {
  await seedLegacyTasks(page, [
    { id: "legacy", title: "Legacy task", completed: false, createdAt: 1 },
  ]);
  await page.goto("/tasks/legacy");

  await expect(page.getByRole("heading", { level: 2, name: "Legacy task" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Notes" })).toHaveValue("");
});

function visibleText(page: Page, text: string) {
  return page.getByText(text, { exact: true }).filter({ visible: true });
}

async function pasteIntoAddField(page: Page, text: string) {
  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.click();
  await input.evaluate((element, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    element.dispatchEvent(event);
  }, text);
  return input;
}

test("adds, completes, filters, and removes tasks", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Add a task" });

  await input.fill("First task");
  await page.getByRole("button", { name: "Add" }).click();
  await input.fill("Second task");
  await input.press("Enter");
  await page.getByRole("checkbox", { name: "Mark First task as completed" }).check();

  await page.getByRole("link", { name: /^Completed 1$/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Completed" })).toBeVisible();
  await expect(page.getByText("First task")).toBeVisible();
  await expect(page.getByText("Second task")).toBeHidden();

  await page.getByRole("button", { name: "Delete task: First task" }).click();
  await expect(page.getByText("Nothing here")).toBeVisible();
  await expect(page.getByText("No completed tasks.")).toBeVisible();
});

test("persists tasks across a reload", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Add a task" });

  await input.fill("Keep after reload");
  await input.press("Enter");
  await expect(page.getByText("Keep after reload")).toBeVisible();
  await page.reload();

  await expect(page.getByText("Keep after reload")).toBeVisible();
});

test("rejects empty and whitespace-only tasks", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Add a task" });

  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Task can't be empty")).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toBeFocused();

  await input.fill("   ");
  await input.press("Enter");
  await expect(page.getByText("Task can't be empty")).toBeVisible();
  await expect(input).toHaveValue("   ");
  await expect(page.getByRole("list")).toHaveCount(0);
});

test("redirects an unknown route and supports a completed deep link", async ({ page }) => {
  await page.goto("/foo");

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 2, name: "All tasks" })).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem(
      "tickd:tasks",
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: "completed",
            title: "Deep linked task",
            completed: true,
            createdAt: 1,
          },
        ],
      }),
    );
  });
  await page.goto("/completed");

  await expect(page).toHaveURL("/completed");
  await expect(page.getByRole("heading", { level: 2, name: "Completed" })).toBeVisible();
  await expect(page.getByText("Deep linked task")).toBeVisible();
});

test("supports browser back and forward between filters", async ({ page }) => {
  await seedTasks(page, [
    { id: "active", title: "Active task", completed: false, createdAt: 1 },
    { id: "completed", title: "Completed task", completed: true, createdAt: 2 },
  ]);
  await page.goto("/");

  await page.getByRole("link", { name: /^Active 1$/ }).click();
  await page.getByRole("link", { name: /^Completed 1$/ }).click();
  await page.goBack();
  await expect(page).toHaveURL("/active");
  await expect(page.getByRole("heading", { level: 2, name: "Active" })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL("/completed");
  await expect(page.getByRole("heading", { level: 2, name: "Completed" })).toBeVisible();
});

test("has no detectable accessibility violations on populated routes", async ({ page }) => {
  await seedTasks(page, [
    { id: "active", title: "Active task", completed: false, createdAt: 1 },
    { id: "completed", title: "Completed task", completed: true, createdAt: 2 },
  ]);

  for (const path of ["/", "/active", "/completed"]) {
    await page.goto(path);
    // The rows fade in with a stagger; axe must judge the settled colours.
    await settle(page);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  }
});

test("has no detectable accessibility violations in the empty state", async ({ page }) => {
  await page.goto("/");
  await settle(page);

  const { violations } = await new AxeBuilder({ page }).analyze();

  expect(violations).toEqual([]);
});

test("pastes a multi-line title as one task line", async ({ page }) => {
  await page.goto("/");
  const input = await pasteIntoAddField(page, "hello\n\nworld");

  await expect(input).toHaveValue("hello world");
  await input.press("Enter");

  await expect(page.getByText("hello world", { exact: true })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(1);
});

test("keeps a 200-character title after reload", async ({ page }) => {
  const title = "a".repeat(200);
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Add a task" });

  await input.fill(title);
  await input.press("Enter");

  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("shows a banner when saved tasks are corrupted and dismisses it", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tickd:tasks", "{not json");
  });
  await page.goto("/");

  const banner = page.getByRole("status").filter({
    hasText: "Couldn't restore saved tasks. Starting fresh.",
  });
  await expect(banner).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "All tasks" })).toBeVisible();
  await expect(page.getByText("All caught up!")).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);

  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(banner).toBeHidden();
});

test("shows the active task count", async ({ page }) => {
  await seedTasks(page, [
    { id: "a", title: "Active one", completed: false, createdAt: 1 },
    { id: "b", title: "Completed one", completed: true, createdAt: 2 },
    { id: "c", title: "Active two", completed: false, createdAt: 3 },
  ]);
  await page.goto("/");

  await expect(visibleText(page, "2 items left")).toHaveCount(1);
});

test("clears completed tasks and keeps active tasks after reload", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Add a task" });

  await input.fill("Active task");
  await input.press("Enter");
  await input.fill("Completed task");
  await input.press("Enter");
  await page.getByRole("checkbox", { name: "Mark Completed task as completed" }).check();

  await expect(visibleText(page, "1 item left")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear completed", exact: true }).click();

  await expect(page.getByText("Completed task", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Active task", { exact: true })).toBeVisible();
  await expect(visibleText(page, "1 item left")).toHaveCount(1);

  await page.reload();

  await expect(page.getByText("Completed task", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Active task", { exact: true })).toBeVisible();
  await expect(visibleText(page, "1 item left")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Clear completed", exact: true })).toBeDisabled();
});

test("disables Clear completed when no task is completed", async ({ page }) => {
  await seedTasks(page, [
    { id: "a", title: "Active one", completed: false, createdAt: 1 },
    { id: "b", title: "Active two", completed: false, createdAt: 2 },
  ]);
  await page.goto("/");

  const clearCompleted = page.getByRole("button", { name: "Clear completed", exact: true });
  await expect(visibleText(page, "2 items left")).toHaveCount(1);
  await expect(clearCompleted).toBeDisabled();
  await expect(clearCompleted).toHaveJSProperty("disabled", true);
});

test("has no detectable accessibility violations on the home page with a footer", async ({
  page,
}) => {
  await seedTasks(page, [
    { id: "active", title: "Active task", completed: false, createdAt: 1 },
    { id: "completed", title: "Completed task", completed: true, createdAt: 2 },
  ]);
  await page.goto("/");

  await expect(visibleText(page, "1 item left")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Clear completed", exact: true })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("renames a task from its title and keeps the new title after reload", async ({ page }) => {
  // Create via UI: seedTasks uses addInitScript and would reset storage on reload.
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Add a task" });
  await input.fill("Old title");
  await input.press("Enter");

  await page.getByRole("button", { name: "Old title", exact: true }).dblclick();
  const editor = page.getByRole("textbox", { name: "Edit task" });
  await editor.fill("New title");
  await editor.press("Enter");

  await expect(page.getByRole("button", { name: "New title", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Old title", exact: true })).toHaveCount(0);

  await page.reload();

  await expect(page.getByRole("button", { name: "New title", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Old title", exact: true })).toHaveCount(0);
});

test("cancels a title edit with Escape", async ({ page }) => {
  await seedTasks(page, [{ id: "edit", title: "Keep title", completed: false, createdAt: 1 }]);
  await page.goto("/");

  await page.getByRole("button", { name: "Keep title", exact: true }).dblclick();
  const editor = page.getByRole("textbox", { name: "Edit task" });
  await editor.fill("Discarded title");
  await editor.press("Escape");

  await expect(page.getByRole("button", { name: "Keep title", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Edit task" })).toHaveCount(0);
  await expect(page.getByText("Discarded title", { exact: true })).toHaveCount(0);
});

test("stays in edit and shows an error when Enter is pressed on an empty title", async ({
  page,
}) => {
  await seedTasks(page, [{ id: "edit", title: "Keep title", completed: false, createdAt: 1 }]);
  await page.goto("/");

  await page.getByRole("button", { name: "Keep title", exact: true }).dblclick();
  const editor = page.getByRole("textbox", { name: "Edit task" });
  await editor.fill("");
  await editor.press("Enter");

  await expect(page.getByText("Task can't be empty")).toBeVisible();
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveAttribute("aria-invalid", "true");
  await expect(editor).toHaveValue("");
  await expect(page.getByRole("button", { name: "Keep title", exact: true })).toHaveCount(0);

  const stored = await page.evaluate(() => localStorage.getItem("tickd:tasks"));
  expect(JSON.parse(stored ?? "null")).toMatchObject({
    version: 2,
    tasks: [{ id: "edit", title: "Keep title", completed: false }],
  });
});

test("has no detectable accessibility violations while a task title is being edited", async ({
  page,
}) => {
  await seedTasks(page, [
    { id: "edit", title: "Editable task", completed: false, createdAt: 1 },
    { id: "other", title: "Other task", completed: false, createdAt: 2 },
  ]);
  await page.goto("/");

  await page.getByRole("button", { name: "Editable task", exact: true }).dblclick();
  await expect(page.getByRole("textbox", { name: "Edit task" })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("restores a deleted task between its neighbours", async ({ page }) => {
  await seedTasks(page, [
    { id: "a", title: "Alpha", completed: false, createdAt: 1 },
    { id: "b", title: "Bravo", completed: false, createdAt: 2 },
    { id: "c", title: "Charlie", completed: false, createdAt: 3 },
  ]);
  await page.goto("/");

  await page.getByRole("button", { name: "Delete task: Bravo" }).click();

  const toast = page.getByRole("status").filter({ hasText: "Task deleted" });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("listitem").nth(0)).toContainText("Alpha");
  await expect(page.getByRole("listitem").nth(1)).toContainText("Charlie");

  await toast.getByRole("button", { name: "Undo", exact: true }).click();

  await expect(toast).toBeHidden();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("listitem").nth(0)).toContainText("Alpha");
  await expect(page.getByRole("listitem").nth(1)).toContainText("Bravo");
  await expect(page.getByRole("listitem").nth(2)).toContainText("Charlie");
});

test("adds a task with n, opens Active with 2, and restores a delete with z", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Add a task" });

  await page.getByRole("heading", { level: 2, name: "All tasks" }).click();
  await page.keyboard.press("n");
  await expect(input).toBeFocused();

  await input.fill("Shortcut task");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "Shortcut task", exact: true })).toBeVisible();

  // Hotkeys do not run while the add field is focused.
  await page.getByRole("heading", { level: 2, name: "All tasks" }).click();
  await expect(input).not.toBeFocused();
  await page.keyboard.press("2");

  await expect(page).toHaveURL("/active");
  await expect(page.getByRole("heading", { level: 2, name: "Active" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Shortcut task", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Delete task: Shortcut task" }).click();
  await expect(page.getByRole("button", { name: "Shortcut task", exact: true })).toHaveCount(0);

  // Deleting the only task returns focus to the add field, which swallows z.
  await page.getByRole("heading", { level: 2, name: "Active" }).click();
  await expect(input).not.toBeFocused();
  await page.keyboard.press("z");

  await expect(page.getByRole("button", { name: "Shortcut task", exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Task deleted" })).toBeHidden();
});

test("has no detectable accessibility violations while the undo toast is visible", async ({
  page,
}) => {
  await seedTasks(page, [
    { id: "a", title: "Alpha", completed: false, createdAt: 1 },
    { id: "b", title: "Bravo", completed: false, createdAt: 2 },
    { id: "c", title: "Charlie", completed: false, createdAt: 3 },
  ]);
  await page.goto("/");

  await page.getByRole("button", { name: "Delete task: Bravo" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Task deleted" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});
