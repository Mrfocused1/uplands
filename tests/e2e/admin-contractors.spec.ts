import { expect, test } from "@playwright/test";

test("admin can manage contractors inside a site workspace", async ({ page }, testInfo) => {
  test.setTimeout(45_000);

  const contractor = `Contractor Register ${testInfo.project.name} ${Date.now()}`;

  await page.goto("/admin/sites/newport");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open contractors/i })).toHaveAttribute("href", "/admin/sites/newport/contractors");

  await page.goto("/admin/sites/newport/contractors");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to admin" })).toHaveAttribute("href", "/admin/sites/newport");

  if (testInfo.project.name === "Desktop Chrome") {
    await expect(page.getByRole("navigation").first().getByRole("link", { name: "Contractors" })).toBeVisible();
  }

  await page.getByRole("button", { name: "New" }).click();
  await page.getByLabel("Company Name").fill(contractor);
  await page.getByLabel("Trade / Work Package").fill("Fire stopping");
  await page.getByLabel("Primary Contact").fill("Paul Bridges");
  await page.getByLabel("Email").fill("paul@example.com");
  await page.getByLabel("Phone").fill("07700 900123");

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/admin/sites/newport/contractors") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Add Contractor" }).click(),
  ]);
  expect(createResponse.ok()).toBe(true);

  await page.getByPlaceholder("Search contractors").fill(contractor);
  await expect(page.getByRole("button", { name: new RegExp(contractor) })).toBeVisible();
  await expect(page.getByText("Fire stopping")).toBeVisible();

  await page.getByLabel("Site Status").selectOption("INACTIVE");
  await page.getByLabel("Phone").fill("07700 900456");

  const [updateResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/admin/sites/newport/contractors") && response.request().method() === "PATCH"),
    page.getByRole("button", { name: "Save Contractor" }).click(),
  ]);
  expect(updateResponse.ok()).toBe(true);

  await expect(page.getByLabel("Site Status")).toHaveValue("INACTIVE");
  await expect(page.getByLabel("Phone")).toHaveValue("07700 900456");
  await expect(page.getByRole("button", { name: new RegExp(contractor) })).toContainText("INACTIVE");
});
