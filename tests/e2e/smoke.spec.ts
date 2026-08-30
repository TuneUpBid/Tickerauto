import { test, expect } from "@playwright/test";

test("landing page presents MotorLedger without fabricated values", async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_WEB_SERVER, "Dev server not managed in this run");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Evidence-backed values/i })).toBeVisible();
  await expect(page.getByText(/does not make lending decisions/i)).toBeVisible();
});
