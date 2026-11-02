import { expect, test } from "@playwright/test";

test("opens the app without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");

  await expect(page).toHaveTitle("Tickd");
  await expect(page.getByRole("heading", { level: 1, name: "Tickd" })).toBeVisible();
  expect(errors).toEqual([]);
});
