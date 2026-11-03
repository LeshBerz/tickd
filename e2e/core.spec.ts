import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

type SeedTask = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

async function seedTasks(page: Page, tasks: SeedTask[]) {
  await page.addInitScript((items) => {
    localStorage.setItem("tickd:tasks", JSON.stringify({ version: 1, tasks: items }));
  }, tasks);
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
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  }
});

test("has no detectable accessibility violations in the empty state", async ({ page }) => {
  await page.goto("/");

  const { violations } = await new AxeBuilder({ page }).analyze();

  expect(violations).toEqual([]);
});
