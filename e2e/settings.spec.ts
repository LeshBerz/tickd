import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, settle, test } from "./fixtures.ts";

type Preferences = {
  version?: number;
  theme?: string;
  language?: string;
  accent?: string;
  showKeyboardHints?: boolean;
  guideCompleted?: boolean;
};

/** Seeds a settled profile: the first-visit tour is not part of these specs. */
async function seedPreferences(page: Page, preferences: Preferences) {
  await page.addInitScript((value) => {
    localStorage.setItem(
      "tickd:preferences",
      JSON.stringify({
        version: 2,
        theme: "system",
        language: "en",
        accent: "teal",
        showKeyboardHints: true,
        guideCompleted: true,
        ...(value as Record<string, unknown>),
      }),
    );
  }, preferences);
}

async function seedTasks(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "tickd:tasks",
      JSON.stringify({
        version: 2,
        tasks: [{ id: "a", title: "Alpha", completed: false, createdAt: 1, notes: "" }],
      }),
    );
  });
}

function storedPreferences(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("tickd:preferences");
    return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
  });
}

test("opens settings from the sidebar and exposes every preference", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Settings" }).first().click();

  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("heading", { level: 2, name: "Settings" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Theme" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Accent color" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Language" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Show keyboard shortcut hints" })).toBeChecked();
});

test("returns from settings to the task list on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await seedTasks(page);
  await page.goto("/settings");

  // The mobile header has no sidebar, so the back link is the only way out besides the browser.
  const back = page.getByRole("link", { name: "Back to tasks" });
  await expect(back).toBeVisible();

  const box = await back.boundingBox();
  expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);

  await back.click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 2, name: "All tasks" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to tasks" })).toHaveCount(0);
});

test("applies a dark theme, an accent palette, and survives a reload", async ({ page }) => {
  await page.goto("/settings");

  await page.getByRole("radio", { name: "Dark" }).check();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // The dark palette is the one active while the page is in dark mode.
  await page.getByRole("radio", { name: "Rose" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "rose");
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--theme-accent").trim(),
      ),
    )
    .toBe("#fda4af");

  const saved = await storedPreferences(page);
  expect(saved).toMatchObject({ version: 2, theme: "dark", accent: "rose" });

  await page.reload();

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute("data-accent", "rose");
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Rose" })).toBeChecked();
});

test("applies the stored theme before the first paint", async ({ page }) => {
  await seedPreferences(page, { theme: "dark", accent: "blue" });
  await page.goto("/");

  // Read the class from an init-time listener: it must already be set before hydration finishes.
  const hadDarkClassOnLoad = await page.evaluate(() => {
    return document.documentElement.classList.contains("dark");
  });

  expect(hadDarkClassOnLoad).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
});

test("switching to Russian translates the settings and the task list", async ({ page }) => {
  await seedTasks(page);
  await page.goto("/settings");

  await page.getByRole("radio", { name: "Русский" }).check();

  await expect(page.getByRole("heading", { level: 2, name: "Настройки" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("link", { name: "Все 1" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Тёмная" })).toBeVisible();

  await page.getByRole("link", { name: "Все 1" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 2, name: "Все задачи" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Добавить задачу" })).toBeVisible();
  await expect(page.getByText("Осталась 1 задача").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Очистить выполненные" })).toBeDisabled();

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Все задачи" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
});

test("the keyboard hint toggle hides and restores hints", async ({ page }) => {
  await page.goto("/settings");
  const toggle = page.getByRole("checkbox", { name: "Show keyboard shortcut hints" });

  await toggle.uncheck();
  await page.getByRole("link", { name: /^All/ }).first().click();

  const addForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Add" }) });
  await expect(addForm.locator("kbd")).toHaveCount(0);
  await expect(page.getByText("Add your first task above.")).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("checkbox", { name: "Show keyboard shortcut hints" }).check();
  await page.getByRole("link", { name: /^All/ }).first().click();

  await expect(addForm.locator("kbd")).toHaveCount(1);
});

test("rejects a malformed stored preference without breaking the app", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tickd:preferences", "{not json");
  });
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 2, name: "All tasks" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "teal");

  // Unreadable preferences fall back to defaults, so the visitor still gets the tour.
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("has no detectable accessibility violations on settings in both themes and languages", async ({
  page,
}) => {
  await page.goto("/settings");

  await settle(page);
  const light = await new AxeBuilder({ page }).analyze();
  expect(light.violations).toEqual([]);

  await page.getByRole("radio", { name: "Dark" }).check();
  await settle(page);
  const dark = await new AxeBuilder({ page }).analyze();
  expect(dark.violations).toEqual([]);

  await page.getByRole("radio", { name: "Русский" }).check();
  await settle(page);
  const russian = await new AxeBuilder({ page }).analyze();
  expect(russian.violations).toEqual([]);
});

test("has no detectable accessibility violations on the main UI in Russian", async ({ page }) => {
  await seedPreferences(page, { language: "ru" });
  await seedTasks(page);
  await page.goto("/");

  for (const path of ["/", "/active", "/completed"]) {
    await page.goto(path);
    // The rows fade in with a stagger; axe must judge the settled colours.
    await settle(page);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  }
});
