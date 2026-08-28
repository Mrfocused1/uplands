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

test("induction form opens cleanly", async ({ page }) => {
  await page.goto("/form");

  await expect(page.getByRole("heading", { name: /Site Induction Registration Form/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible({ timeout: 12_000 });
  await expect(page.getByRole("button", { name: /Continue/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoCriticalA11yViolations(page);
});

test("admin submissions list renders from the configured runtime store", async ({ page }) => {
  await page.goto("/admin/submissions");

  await expect(page.getByRole("heading", { name: "Inductions" })).toBeVisible();
  await expect(page.getByPlaceholder("Search names, company, site, reference...")).toBeVisible();
  await expect(page.getByText(/shown of .* total/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoCriticalA11yViolations(page);
});
