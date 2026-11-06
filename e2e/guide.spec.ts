import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

/** These specs start from a genuinely new browser profile, so the tour may open. */

const PREFERENCES_KEY = "tickd:preferences";
const TASKS_KEY = "tickd:tasks";

async function storedPreferences(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
  }, PREFERENCES_KEY);
}

async function storedTasks(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null
      ? null
      : (JSON.parse(raw) as { version: number; tasks: { title: string; completed: boolean }[] });
  }, TASKS_KEY);
}

async function dismissTourWithEscape(page: Page) {
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

/** Viewport-relative box, the same coordinate space the spotlight is positioned in. */
async function viewportBox(locator: Locator) {
  const box = await locator.evaluate((element) => element.getBoundingClientRect().toJSON());
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

test("walks a new visitor through five steps and remembers the tour", async ({ page }) => {
  await page.goto("/");

  const tour = page.getByRole("dialog");
  await expect(tour).toBeVisible();
  await expect(tour).toHaveAccessibleName("Welcome to Tickd");
  await expect(tour).toHaveAttribute("aria-modal", "true");
  await expect(tour.getByText("Step 1 of 5")).toBeVisible();
  await expect(tour).toHaveCSS("position", "fixed");

  // The dialog owns focus as soon as it opens.
  await expect(tour).toBeFocused();

  const welcomeAudit = await new AxeBuilder({ page }).analyze();
  expect(welcomeAudit.violations).toEqual([]);

  await tour.getByRole("button", { name: "Next" }).click();
  await expect(tour.getByText("Step 2 of 5")).toBeVisible();
  await expect(tour.getByRole("heading", { name: "Switch between views" })).toBeVisible();

  // The spotlight follows the target it describes instead of covering the whole page.
  const spotlight = page.locator('[data-guide-spotlight="filters"]');
  await expect(spotlight).toBeVisible();
  const filters = page.locator('nav[data-guide="filters"]').filter({ visible: true }).first();
  // The spotlight animates into place, so poll until it settles around its target.
  await expect
    .poll(async () => {
      const spotlightBox = await viewportBox(spotlight);
      const filtersBox = await viewportBox(filters);
      const offset = Math.abs(spotlightBox.y - filtersBox.y);
      return offset <= 10 && spotlightBox.width >= filtersBox.width;
    })
    .toBe(true);

  const stepAudit = await new AxeBuilder({ page }).analyze();
  expect(stepAudit.violations).toEqual([]);

  await tour.getByRole("button", { name: "Next" }).click();
  await expect(tour.getByRole("heading", { name: "Add a task" })).toBeVisible();

  // Back is available from the second step onwards and returns to the previous one.
  await tour.getByRole("button", { name: "Back" }).click();
  await expect(tour.getByText("Step 2 of 5")).toBeVisible();
  await tour.getByRole("button", { name: "Next" }).click();
  await tour.getByRole("button", { name: "Next" }).click();
  await expect(tour.getByRole("heading", { name: "Start with examples" })).toBeVisible();

  await tour.getByRole("button", { name: "Next" }).click();
  await expect(tour.getByText("Step 5 of 5")).toBeVisible();
  await expect(tour.getByRole("heading", { name: "Make it yours" })).toBeVisible();
  await expect(tour.getByRole("button", { name: "Next" })).toHaveCount(0);

  await tour.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  expect(await storedPreferences(page)).toMatchObject({
    version: 2,
    theme: "system",
    language: "en",
    accent: "teal",
    showKeyboardHints: true,
    guideCompleted: true,
  });

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "All tasks" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Escape skips the tour without touching task data", async ({ page }) => {
  await page.goto("/");

  await dismissTourWithEscape(page);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  expect(await storedTasks(page)).toBeNull();
  expect(await storedPreferences(page)).toMatchObject({ guideCompleted: true });

  await page.getByRole("textbox", { name: "Add a task" }).fill("After skipping");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "After skipping", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "After skipping", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("replays the tour from settings and keeps the other preferences", async ({ page }) => {
  await page.goto("/");
  await dismissTourWithEscape(page);

  await page.getByRole("link", { name: "Settings" }).first().click();
  await expect(page).toHaveURL("/settings");
  await page.getByRole("radio", { name: "Dark" }).check();
  await page.getByRole("radio", { name: "Rose" }).check();

  await page.getByRole("button", { name: "Replay the tour" }).click();

  const tour = page.getByRole("dialog");
  await expect(tour).toBeVisible();
  await expect(page).toHaveURL("/");
  await expect(tour.getByText("Step 1 of 5")).toBeVisible();
  await expect(tour).toHaveAccessibleName("Welcome to Tickd");

  await dismissTourWithEscape(page);

  expect(await storedPreferences(page)).toMatchObject({
    version: 2,
    theme: "dark",
    accent: "rose",
    guideCompleted: true,
  });

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute("data-accent", "rose");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("skipping a replay keeps the tour completed", async ({ page }) => {
  await page.goto("/");
  await dismissTourWithEscape(page);
  await page.goto("/settings");

  await page.getByRole("button", { name: "Replay the tour" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Skip" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await storedPreferences(page)).toMatchObject({ guideCompleted: true });

  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("loads three sample tasks once and keeps them after a reload", async ({ page }) => {
  await page.goto("/");
  await dismissTourWithEscape(page);

  const loadSamples = page.getByRole("button", { name: "Load sample tasks" });
  await expect(loadSamples).toBeVisible();

  const emptyAudit = await new AxeBuilder({ page }).analyze();
  expect(emptyAudit.violations).toEqual([]);

  await loadSamples.click();

  const list = page.getByRole("list");
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list).toContainText("Plan tomorrow's top three tasks");
  await expect(list).toContainText("Take a 20-minute walk");
  await expect(list).toContainText("Message a friend");
  await expect(page.getByRole("button", { name: "Load sample tasks" })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();

  const stored = await storedTasks(page);
  expect(stored?.version).toBe(2);
  expect(stored?.tasks.map((item) => item.title)).toEqual([
    "Plan tomorrow's top three tasks",
    "Take a 20-minute walk",
    "Message a friend",
  ]);
  expect(stored?.tasks.every((item) => item.completed === false)).toBe(true);

  const ids = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null
      ? []
      : (JSON.parse(raw) as { tasks: { id: string }[] }).tasks.map((t) => t.id);
  }, TASKS_KEY);
  expect(ids).toEqual(["sample-plan", "sample-walk", "sample-message"]);

  await page.reload();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Load sample tasks" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("localizes the tour and the sample tasks in Russian", async ({ page }) => {
  await page.goto("/");
  await dismissTourWithEscape(page);
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Русский" }).check();

  await page.getByRole("button", { name: "Пройти знакомство заново" }).click();

  const tour = page.getByRole("dialog");
  await expect(tour).toBeVisible();
  await expect(tour.getByText("Шаг 1 из 5")).toBeVisible();
  await expect(tour.getByRole("heading", { name: "Добро пожаловать в Tickd" })).toBeVisible();
  await expect(tour.getByRole("button", { name: "Далее" })).toBeVisible();
  await expect(tour.getByRole("button", { name: "Пропустить" })).toBeVisible();

  await tour.getByRole("button", { name: "Далее" }).click();
  await expect(tour).toHaveAccessibleName("Переключайтесь между списками");
  await tour.getByRole("button", { name: "Пропустить" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { level: 2, name: "Все задачи" })).toBeVisible();

  await page.getByRole("button", { name: "Загрузить примеры задач" }).click();
  const list = page.getByRole("list");
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list).toContainText("Спланировать три главные задачи на завтра");
  await expect(list).toContainText("Прогуляться 20 минут");
  await expect(list).toContainText("Написать другу");

  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
});

test("a version 1 preferences payload keeps its values and can restart the tour", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "tickd:preferences",
      JSON.stringify({
        version: 1,
        theme: "dark",
        language: "en",
        accent: "amber",
        showKeyboardHints: false,
      }),
    );
  });
  await page.goto("/");

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute("data-accent", "amber");

  const tour = page.getByRole("dialog");
  await expect(tour).toBeVisible();
  await tour.getByRole("button", { name: "Skip" }).click();

  expect(await storedPreferences(page)).toMatchObject({
    version: 2,
    theme: "dark",
    accent: "amber",
    showKeyboardHints: false,
    guideCompleted: true,
  });
});

test.describe("mobile width", () => {
  test.use({ viewport: { width: 375, height: 700 } });

  test("keeps the tour and its card inside the viewport", async ({ page }) => {
    await page.goto("/");

    const tour = page.getByRole("dialog");
    await expect(tour).toBeVisible();

    for (let step = 1; step <= 5; step += 1) {
      await expect(tour.getByText(`Step ${step} of 5`)).toBeVisible();
      const box = await tour.boundingBox();
      expect(box).not.toBeNull();
      if (box !== null) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375);
        expect(box.y + box.height).toBeLessThanOrEqual(700);
      }
      if (step < 5) {
        await tour.getByRole("button", { name: "Next" }).click();
      }
    }

    await expect(page.locator('[data-guide-spotlight="settings"]')).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);

    await tour.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await storedPreferences(page)).toMatchObject({ guideCompleted: true });
  });
});
