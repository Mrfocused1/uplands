import { expect, test } from "@playwright/test";

test("admin can draft, submit and review a day handover", async ({ page }, testInfo) => {
  test.setTimeout(45_000);

  const unique = `${testInfo.project.name} ${Date.now()}`;
  const managerName = `Handover Manager ${unique}`;
  const workCompleted = `DAY shift handover test works ${unique}`;
  const outstandingAction = `DAY shift action ${unique}`;

  await page.goto("/admin/sites/newport");
  await expect(page.getByRole("link", { name: /Open handover/i })).toHaveAttribute("href", "/admin/sites/newport/handover");

  await page.goto("/admin/sites/newport/handover");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New Handover" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to admin" })).toHaveAttribute("href", "/admin/sites/newport");
  await page.getByRole("button", { name: "Use Site Snapshot" }).click();
  await expect(page.getByText("Site snapshot added")).toBeVisible();

  await page.getByLabel("Shift").selectOption("DAY");
  await page.getByLabel("Site Manager").fill(managerName);
  await page.getByLabel("Work Completed").fill(workCompleted);
  await page.getByLabel("Contractors Present").fill("Electrical contractor, ceilings contractor");
  await page.getByLabel("Active Permits").fill("Electrical permit active until 18:00");
  await page.getByLabel("Issues / Actions").fill(outstandingAction);
  await page.getByLabel("Deliveries").fill("No deliveries outstanding");
  await page.getByLabel("Notes").fill("Prepared by Playwright handover coverage.");

  const [draftResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/admin/sites/newport/handovers") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Save Draft" }).click(),
  ]);
  expect(draftResponse.ok()).toBe(true);
  await expect(page.getByText("Draft saved").first()).toBeVisible();
  await expect(page.getByText("DRAFT").first()).toBeVisible();

  const [submitResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/admin/sites/newport/handovers") && response.request().method() === "PATCH"),
    page.getByRole("button", { name: "Submit Handover" }).click(),
  ]);
  expect(submitResponse.ok()).toBe(true);
  await expect(page.getByText("Handover submitted").first()).toBeVisible();

  const history = page.getByLabel("Handover History");
  await expect(history).toContainText("DAY");
  await expect(history).toContainText("SUBMITTED");
  await expect(history).toContainText(managerName);
  await expect(history).toContainText(workCompleted);
  await expect(history).toContainText(outstandingAction);

  await page.goto("/admin/sites/newport");
  const handoverCard = page.getByRole("link", { name: /Handover/i }).filter({ hasText: "Handover" }).first();
  await expect(handoverCard).toHaveAttribute("href", "/admin/sites/newport/handover");
  await expect(handoverCard).toContainText("Handover");
});
