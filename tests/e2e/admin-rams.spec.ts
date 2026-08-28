import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function expectNoCriticalA11yViolations(page: Page) {
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const critical = scan.violations.filter((violation) => violation.impact === "critical");

  expect(
    critical,
    critical.map((violation) => `${violation.id}: ${violation.help}`).join("\n"),
  ).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);
}

test("admin RAMS page renders cleanly on desktop and mobile", async ({ page }) => {
  await page.goto("/admin/rams");

  await expect(page.getByRole("heading", { name: "RAMS" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Upload RAMS" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoCriticalA11yViolations(page);
});

test("mobile admin navigation exposes RAMS from the submissions area", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "Desktop Chrome", "Mobile navigation is hidden on desktop.");

  await page.goto("/admin/submissions");
  await page.getByLabel("Open admin navigation menu").click();
  await page.locator("details nav").getByRole("link", { name: "RAMS" }).click();

  await expect(page).toHaveURL(/\/admin\/rams$/);
  await expect(page.getByRole("heading", { name: "RAMS" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
