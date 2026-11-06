import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

const LONG_TITLE_EN =
  "Prepare the quarterly review deck with the marketing numbers and the retention cohort breakdown";
const LONG_TITLE_RU =
  "Очень длинное название задачи: подготовить квартальный обзор с маркетинговыми числами и разбивкой по когортам удержания";

const WIDTHS = [320, 375, 390, 768, 1024, 1280, 1440, 1920];

async function seed(page: Page, language: "en" | "ru", title: string) {
  await page.addInitScript(
    ({ lang, longTitle }) => {
      localStorage.setItem(
        "tickd:tasks",
        JSON.stringify({
          version: 2,
          tasks: [
            { id: "a", title: "Alpha", completed: false, createdAt: 1, notes: "" },
            { id: "b", title: "Bravo", completed: false, createdAt: 2, notes: "" },
            { id: "c", title: "Charlie", completed: true, createdAt: 3, notes: "" },
            { id: "long", title: longTitle, completed: false, createdAt: 4, notes: "x" },
          ],
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
    { lang: language, longTitle: title },
  );
}

function documentWidth(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
}

test.describe("no horizontal scroll on any supported width", () => {
  for (const width of WIDTHS) {
    for (const language of ["en", "ru"] as const) {
      test(`fits at ${width}px in ${language}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 780 });
        await seed(page, language, language === "ru" ? LONG_TITLE_RU : LONG_TITLE_EN);

        for (const path of ["/", "/tasks/a", "/tasks/long", "/settings"]) {
          await page.goto(path);
          // Let the short entrance animations finish before measuring the document width.
          await page.waitForTimeout(400);
          const { scrollWidth, innerWidth } = await documentWidth(page);
          expect(scrollWidth, `${path} at ${width}px`).toBeLessThanOrEqual(innerWidth);
        }
      });
    }
  }
});

test.describe("long content stays inside its container", () => {
  for (const width of [320, 390, 1024]) {
    test(`wraps a long title at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await seed(page, "ru", LONG_TITLE_RU);
      await page.goto("/");

      const title = page.getByRole("button", { name: LONG_TITLE_RU, exact: true });
      await expect(title).toBeVisible();
      const row = title.locator("xpath=ancestor::li[1]");
      const rowBox = await row.boundingBox();
      const titleBox = await title.boundingBox();
      expect(rowBox).not.toBeNull();
      expect(titleBox).not.toBeNull();
      expect((titleBox?.x ?? 0) + (titleBox?.width ?? 0)).toBeLessThanOrEqual(
        (rowBox?.x ?? 0) + (rowBox?.width ?? 0),
      );
      // The title wraps instead of being clipped.
      expect(titleBox?.height ?? 0).toBeGreaterThan(28);
    });
  }

  test("keeps the long filter names inside the mobile bar", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await seed(page, "ru", LONG_TITLE_RU);
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Фильтр задач" }).first();
    const navBox = await nav.boundingBox();
    const links = nav.getByRole("link");
    const count = await links.count();
    expect(count).toBe(3);
    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        (navBox?.x ?? 0) + (navBox?.width ?? 0),
      );
    }
  });
});

test.describe("notes field and detail panel fit the screen", () => {
  for (const width of [320, 390, 768]) {
    test(`keeps the notes field inside the viewport at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await seed(page, "ru", LONG_TITLE_RU);
      await page.goto("/tasks/long");

      const notes = page.getByRole("textbox", { name: "Заметки" });
      await expect(notes).toBeVisible();
      const box = await notes.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);

      const { scrollWidth, innerWidth } = await documentWidth(page);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }

  test("uses the full width for the panel on a phone and keeps the list hidden", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await seed(page, "en", LONG_TITLE_EN);
    await page.goto("/tasks/a");

    await expect(page.getByRole("complementary", { name: "Alpha" })).toBeVisible();
    await expect(page.locator("form[data-guide='add-form']")).toBeHidden();
    await expect(page.getByRole("heading", { level: 2, name: "All tasks" })).toBeHidden();
  });
});

test.describe("the mobile footer never covers the undo toast", () => {
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 780],
  ] as [number, number][]) {
    test(`keeps a gap at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await seed(page, "en", LONG_TITLE_EN);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 2, name: "All tasks" })).toBeVisible();

      await page.getByRole("button", { name: "Delete task: Bravo" }).click();
      const toast = page.getByRole("status").filter({ hasText: "Task deleted" });
      await expect(toast).toBeVisible();

      const toastBox = await toast.boundingBox();
      const footerBox = await page.locator("footer").filter({ visible: true }).boundingBox();
      expect(toastBox).not.toBeNull();
      expect(footerBox).not.toBeNull();
      expect((toastBox?.y ?? 0) + (toastBox?.height ?? 0)).toBeLessThanOrEqual(footerBox?.y ?? 0);
      expect(toastBox?.y ?? 0).toBeGreaterThanOrEqual(0);
    });
  }

  test("keeps the last row reachable while the toast is shown", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, "en", LONG_TITLE_EN);
    await page.goto("/");

    await page.getByRole("button", { name: "Delete task: Alpha" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Task deleted" })).toBeVisible();

    // Scrolling to the very end must expose the last row above the sticky footer.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);

    const lastTitle = page.getByRole("button", { name: LONG_TITLE_EN, exact: true });
    await expect(lastTitle).toBeInViewport();

    const titleBox = await lastTitle.boundingBox();
    const footerBox = await page.locator("footer").filter({ visible: true }).boundingBox();
    expect(titleBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    expect((titleBox?.y ?? 0) + (titleBox?.height ?? 0)).toBeLessThanOrEqual(footerBox?.y ?? 0);
  });
});

test.describe("the guide card fits small phones", () => {
  for (const [width, height] of [
    [320, 568],
    [390, 780],
  ] as [number, number][]) {
    test(`stays inside ${width}x${height} on every step`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      // A brand-new visitor: the tour must open on its own.
      await page.addInitScript(() => {
        localStorage.setItem(
          "tickd:tasks",
          JSON.stringify({
            version: 2,
            tasks: [{ id: "a", title: "Alpha", completed: false, createdAt: 1, notes: "" }],
          }),
        );
        localStorage.setItem(
          "tickd:preferences",
          JSON.stringify({
            version: 2,
            theme: "light",
            language: "en",
            accent: "teal",
            showKeyboardHints: true,
            guideCompleted: false,
          }),
        );
      });
      await page.goto("/");

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      for (let step = 0; step < 5; step += 1) {
        // The card scales in; measure once the entrance animation has settled.
        await expect
          .poll(async () => Math.round((await dialog.boundingBox())?.height ?? 0))
          .toBeGreaterThan(0);
        await page.waitForTimeout(300);
        const box = await dialog.boundingBox();
        expect(box).not.toBeNull();
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
        expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height);

        // Every action of the card is inside the card, so nothing is cut off.
        const buttons = dialog.getByRole("button");
        const count = await buttons.count();
        for (let index = 0; index < count; index += 1) {
          const buttonBox = await buttons.nth(index).boundingBox();
          if (buttonBox === null) {
            continue;
          }
          expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(
            (box?.y ?? 0) + (box?.height ?? 0) + 1,
          );
          expect(Math.round(buttonBox.height)).toBeGreaterThanOrEqual(44);
        }

        const next = dialog.getByRole("button", { name: /^(Next|Done)$/ });
        if ((await next.count()) === 0) {
          break;
        }
        await next.click();
        await page.waitForTimeout(250);
      }
    });
  }
});

test.describe("tap targets on mobile", () => {
  for (const width of [320, 390]) {
    test(`keeps interactive targets at least 44px at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await seed(page, "ru", LONG_TITLE_RU);

      for (const path of ["/", "/settings"]) {
        await page.goto(path);
        await page.waitForTimeout(150);
        const small = await page.evaluate(() => {
          const nodes = [
            ...document.querySelectorAll(
              "button, a[href], input, select, textarea, [role='button'], [tabindex]:not([tabindex='-1'])",
            ),
          ];
          const out: { tag: string; text: string; w: number; h: number }[] = [];
          for (const element of nodes) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              continue;
            }
            // A label makes its control clickable over the whole label area.
            const label = element.closest("label");
            const target = label === null ? rect : label.getBoundingClientRect();
            // CSS 44px targets can resolve to 43.99px after browser layout rounding.
            if (target.width >= 43.5 && target.height >= 43.5) {
              continue;
            }
            out.push({
              tag: element.tagName,
              text: (element.textContent ?? "").trim().slice(0, 40),
              w: Math.round(target.width),
              h: Math.round(target.height),
            });
          }
          return out;
        });
        expect(small, `${path} at ${width}px`).toEqual([]);
      }
    });
  }
});

test("settings stays readable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page, "ru", LONG_TITLE_RU);
  await page.goto("/settings");

  await expect(page.getByRole("heading", { level: 2, name: "Настройки" })).toBeVisible();

  const clipped = await page.evaluate(() => {
    return [...document.querySelectorAll("h2, h3, p, label, button")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.right > window.innerWidth + 0.5;
      })
      .map((element) => (element.textContent ?? "").trim().slice(0, 40));
  });
  expect(clipped).toEqual([]);

  const { scrollWidth, innerWidth } = await documentWidth(page);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

  // The staggered entrance fades cards in; axe must judge the settled colours.
  await page.waitForTimeout(500);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("keeps the dark theme free of horizontal scroll on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "tickd:preferences",
      JSON.stringify({
        version: 2,
        theme: "dark",
        language: "ru",
        accent: "rose",
        showKeyboardHints: true,
        guideCompleted: true,
      }),
    );
    localStorage.setItem(
      "tickd:tasks",
      JSON.stringify({
        version: 2,
        tasks: [
          {
            id: "long",
            title:
              "Очень длинное название задачи: подготовить квартальный обзор и разбивку по когортам",
            completed: false,
            createdAt: 1,
            notes: "",
          },
        ],
      }),
    );
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);

  const { scrollWidth, innerWidth } = await documentWidth(page);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});
