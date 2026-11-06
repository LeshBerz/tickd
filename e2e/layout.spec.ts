import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

type Tasks = { id: string; title: string; completed: boolean; createdAt: number; notes?: string }[];

const TASKS: Tasks = [
  { id: "a", title: "Alpha", completed: false, createdAt: 1 },
  { id: "b", title: "Bravo", completed: false, createdAt: 2 },
  { id: "c", title: "Charlie", completed: true, createdAt: 3 },
];

/** Seeds both stores before the app boots, so no reload is needed to settle them. */
async function seed(page: Page, tasks: Tasks = TASKS, language: "en" | "ru" = "en") {
  await page.addInitScript(
    ({ items, lang }) => {
      localStorage.setItem(
        "tickd:tasks",
        JSON.stringify({
          version: 2,
          tasks: items.map((item) => ({ ...item, notes: item.notes ?? "" })),
        }),
      );
      localStorage.setItem(
        "tickd:preferences",
        JSON.stringify({
          version: 2,
          theme: "light",
          language: lang,
          accent: "teal",
          showKeyboardHints: true,
          guideCompleted: true,
        }),
      );
    },
    { items: tasks, lang: language },
  );
}

function addForm(page: Page) {
  return page.locator("form[data-guide='add-form']");
}

function viewHeading(page: Page, name: string) {
  return page.getByRole("heading", { level: 2, name });
}

/** Rounded geometry of an element, or null when it is not laid out. */
async function geometry(locator: ReturnType<Page["locator"]>) {
  const box = await locator.boundingBox();
  if (box === null) {
    return null;
  }
  return {
    x: Math.round(box.x),
    width: Math.round(box.width),
    centerX: Math.round(box.x + box.width / 2),
  };
}

test.describe("the task list does not move when a card opens", () => {
  for (const width of [1280, 1440, 1920]) {
    test(`keeps the column in place at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await seed(page);

      await page.goto("/");
      await expect(viewHeading(page, "All tasks")).toBeVisible();
      const closedHeading = await geometry(viewHeading(page, "All tasks"));
      const closedForm = await geometry(addForm(page));

      await page.goto("/tasks/a");
      await expect(viewHeading(page, "Alpha")).toBeVisible();
      const openHeading = await geometry(viewHeading(page, "All tasks"));
      const openForm = await geometry(addForm(page));

      expect(closedHeading).not.toBeNull();
      expect(openHeading).not.toBeNull();
      // Same left edge and the same form width: only the space to the right is used by the card.
      expect(Math.abs((openHeading?.x ?? 0) - (closedHeading?.x ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs((openForm?.width ?? 0) - (closedForm?.width ?? 0))).toBeLessThanOrEqual(1);

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

      // The card slides in horizontally; wait for the entrance animation to settle, otherwise
      // its transient offset is measured instead of the final geometry.
      const panelLocator = page.getByRole("complementary", { name: "Alpha" });
      await expect
        .poll(async () => {
          const box = await panelLocator.boundingBox();
          return Math.round((box?.x ?? 0) + (box?.width ?? 0));
        })
        .toBeLessThanOrEqual(innerWidth);

      // The card takes the free space on the right.
      const panel = await geometry(panelLocator);
      expect(panel).not.toBeNull();
      expect(panel?.width ?? 0).toBeGreaterThan(160);
      expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThanOrEqual(innerWidth);
    });
  }

  test("keeps the left edge and stays inside the viewport at 1024px", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await seed(page);

    await page.goto("/");
    await expect(viewHeading(page, "All tasks")).toBeVisible();
    const closedHeading = await geometry(viewHeading(page, "All tasks"));
    const closedForm = await geometry(addForm(page));

    await page.goto("/tasks/a");
    await expect(viewHeading(page, "Alpha")).toBeVisible();
    const openHeading = await geometry(viewHeading(page, "All tasks"));
    const openForm = await geometry(addForm(page));

    expect(Math.abs((openHeading?.x ?? 0) - (closedHeading?.x ?? 0))).toBeLessThanOrEqual(1);
    // Space runs out here, so the list may narrow — but only on the right.
    expect(openForm?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(closedForm?.width ?? 0);

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test("shows the card full width on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await seed(page);

    await page.goto("/tasks/a");
    await expect(viewHeading(page, "Alpha")).toBeVisible();
    await expect(addForm(page)).toBeHidden();

    // The panel slides in; wait for the entrance animation to settle before measuring.
    const panelLocator = page.getByRole("complementary", { name: "Alpha" });
    await expect.poll(async () => (await geometry(panelLocator))?.x).toBe(0);
    const panel = await geometry(panelLocator);
    expect(panel?.width).toBe(390);

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});

test.describe("the N hint never overlaps the Add button", () => {
  for (const width of [390, 768, 1280]) {
    for (const language of ["en", "ru"] as const) {
      test(`keeps a gap at ${width}px in ${language}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await seed(page, TASKS, language);
        await page.goto("/");

        const form = addForm(page);
        const kbd = form.locator("kbd");
        const button = form.getByRole("button", { name: language === "ru" ? "Добавить" : "Add" });
        const input = form.getByRole("textbox");

        const inputBox = await input.boundingBox();
        const buttonBox = await button.boundingBox();
        expect(inputBox).not.toBeNull();
        expect(buttonBox).not.toBeNull();

        // The button sits inside the input pill and never leaves it.
        expect((buttonBox?.x ?? 0) + (buttonBox?.width ?? 0)).toBeLessThanOrEqual(
          (inputBox?.x ?? 0) + (inputBox?.width ?? 0),
        );

        if (await kbd.isVisible()) {
          const kbdBox = await kbd.boundingBox();
          expect(kbdBox).not.toBeNull();
          expect((kbdBox?.x ?? 0) + (kbdBox?.width ?? 0)).toBeLessThanOrEqual(buttonBox?.x ?? 0);
          // The hint and the button stay clear of the text area of the field.
          const paddingRight = await input.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).paddingRight),
          );
          const blockLeft = kbdBox?.x ?? 0;
          expect(blockLeft - (inputBox?.x ?? 0)).toBeGreaterThanOrEqual(0);
          expect((inputBox?.x ?? 0) + (inputBox?.width ?? 0) - paddingRight).toBeLessThanOrEqual(
            blockLeft + 0.5,
          );
        }
      });
    }
  }
});

test.describe("the undo toast is centred on the visible task area", () => {
  const viewports = [1024, 1280, 1440, 1920];

  for (const width of viewports) {
    for (const cardOpen of [false, true]) {
      test(`centres over ${cardOpen ? "the list column" : "the main area"} at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await seed(page);
        await page.goto("/");
        await expect(viewHeading(page, "All tasks")).toBeVisible();

        await page.getByRole("button", { name: "Delete task: Bravo" }).click();
        const toast = page.getByRole("status").filter({ hasText: "Task deleted" });
        await expect(toast).toBeVisible();

        if (cardOpen) {
          await page.getByRole("button", { name: "Alpha", exact: true }).click();
          await expect(viewHeading(page, "Alpha")).toBeVisible();
        }

        const target = cardOpen ? page.locator("[data-task-column]") : page.locator("main");
        const targetBox = await target.boundingBox();
        const toastBox = await toast.boundingBox();
        expect(targetBox).not.toBeNull();
        expect(toastBox).not.toBeNull();

        const targetCenter = (targetBox?.x ?? 0) + (targetBox?.width ?? 0) / 2;
        const toastCenter = (toastBox?.x ?? 0) + (toastBox?.width ?? 0) / 2;
        expect(Math.abs(toastCenter - targetCenter)).toBeLessThanOrEqual(2);
      });
    }
  }

  test("keeps the same centre while the entrance animation runs", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seed(page);
    await page.goto("/");
    await expect(viewHeading(page, "All tasks")).toBeVisible();

    await page.getByRole("button", { name: "Delete task: Bravo" }).click();
    const toast = page.getByRole("status").filter({ hasText: "Task deleted" });
    await expect(toast).toBeVisible();

    // Sampled mid-animation and again when it settled: only the vertical offset may change.
    const samples: { center: number; height: number }[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const box = await toast.boundingBox();
      samples.push({
        center: Math.round((box?.x ?? 0) + (box?.width ?? 0) / 2),
        height: Math.round(box?.height ?? 0),
      });
      await page.waitForTimeout(120);
    }

    const mainBox = await page.locator("main").boundingBox();
    const mainCenter = (mainBox?.x ?? 0) + (mainBox?.width ?? 0) / 2;
    for (const sample of samples) {
      expect(Math.abs(sample.center - mainCenter)).toBeLessThanOrEqual(2);
    }
  });

  test("centres on the viewport above the mobile footer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await seed(page);
    await page.goto("/");
    await expect(viewHeading(page, "All tasks")).toBeVisible();

    await page.getByRole("button", { name: "Delete task: Bravo" }).click();
    const toast = page.getByRole("status").filter({ hasText: "Task deleted" });
    await expect(toast).toBeVisible();

    const toastBox = await toast.boundingBox();
    const footerBox = await page.locator("footer").filter({ visible: true }).boundingBox();
    expect(toastBox).not.toBeNull();
    expect(footerBox).not.toBeNull();

    expect(Math.abs((toastBox?.x ?? 0) + (toastBox?.width ?? 0) / 2 - 195)).toBeLessThanOrEqual(2);
    // The toast sits above the footer instead of covering it.
    expect((toastBox?.y ?? 0) + (toastBox?.height ?? 0)).toBeLessThanOrEqual(footerBox?.y ?? 0);
  });
});
