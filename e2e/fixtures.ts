import { test as base, expect, type Page } from "@playwright/test";

/**
 * A brand-new visitor would get the first-visit tour, which covers the page with its
 * scrim and swallows every click. Specs that are not about the tour start from a
 * returning user instead. The key is only written when storage is still empty, so a
 * spec that seeds its own payload or the app's own writes always win afterwards.
 */
const RETURNING_VISITOR_PREFERENCES = {
  version: 2,
  theme: "system",
  language: "en",
  accent: "teal",
  showKeyboardHints: true,
  guideCompleted: true,
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((preferences) => {
      try {
        if (window.localStorage.getItem("tickd:preferences") === null) {
          window.localStorage.setItem("tickd:preferences", JSON.stringify(preferences));
        }
      } catch {
        // Blocked storage: specs that depend on preferences seed their own payload.
      }
    }, RETURNING_VISITOR_PREFERENCES);
    await use(page);
  },
});

/**
 * Waits until entrance animations and colour transitions have finished.
 * Accessibility and colour checks must judge settled styles, not translucent keyframes.
 */
export async function settle(page: Page, timeout = 3000): Promise<void> {
  const allSettled = () =>
    page.evaluate(() =>
      document.getAnimations().every((animation) => animation.playState !== "running"),
    );
  await expect.poll(allSettled, { timeout }).toBe(true);
}

export { expect };
