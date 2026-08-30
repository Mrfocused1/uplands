import { expect, test } from "@playwright/test";

test("admin can create, edit and download a step ladders permit", async ({ page }) => {
  test.setTimeout(45_000);

  const contractor = `Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Step Ladders / Ladders Permit" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("Back of house stock room");
  await page.getByPlaceholder("Description of work").fill("Inspect ceiling signage using a step ladder.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Step Ladders / Ladders Permit" })).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);
  await expect(page.getByText("Permit created").first()).toBeVisible();

  const yesButtons = await page.getByRole("button", { name: "YES" }).all();
  for (const button of yesButtons) {
    await button.click();
  }

  const submitForReview = page.getByRole("button", { name: "Submit for Review" });
  await expect(submitForReview).toBeEnabled();
  await submitForReview.click();
  await expect(page.getByText("Permit submitted for review").first()).toBeVisible();

  const managerSignature = page.locator("article").filter({ has: page.getByRole("heading", { name: "Uplands Site Manager Authorisation" }) });
  await managerSignature.getByPlaceholder("Name").fill("Matty");
  await managerSignature.getByPlaceholder("Company").fill("Uplands");
  await managerSignature.getByPlaceholder("Position").fill("Site Manager");

  await page.getByRole("button", { name: "Authorise Permit" }).click();
  await expect(page.getByText("AUTHORISED").first()).toBeVisible();
  await expect(page.getByText("Permit authorised").first()).toBeVisible();

  const pdfHref = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  expect(pdfHref).toBeTruthy();
  const response = await page.request.get(pdfHref!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("admin can create and authorise an electrical permit", async ({ page }) => {
  test.setTimeout(45_000);

  const contractor = `Electrical Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await page.getByRole("combobox").selectOption("electrical");
  await expect(page.getByRole("heading", { name: "Electrical Permit" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("Main distribution board");
  await page.getByPlaceholder("Description of work").fill("Isolate and test circuits for controlled electrical works.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Electrical Permit" })).toBeVisible();
  await expect(page.getByText("Uplands Site Electrician Declaration")).toBeVisible();
  await expect(page.getByText("Are control panels locked off?")).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent supervisor been appointed?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("Electrical supervisor: Paul Bridges");

  const isolationQuestion = page.locator(".p-4").filter({ hasText: "Is the apparatus dead and isolated from supply" });
  await isolationQuestion.getByPlaceholder("Comment").fill("Isolated at DB-01 and DB-02.");

  const yesButtons = await page.getByRole("button", { name: "YES" }).all();
  for (const button of yesButtons) {
    await button.click();
  }

  const submitForReview = page.getByRole("button", { name: "Submit for Review" });
  await expect(submitForReview).toBeEnabled();
  await submitForReview.click();
  await expect(page.getByText("Permit submitted for review").first()).toBeVisible();

  const managerSignature = page.locator("article").filter({ has: page.getByRole("heading", { name: "Uplands Site Manager Authorisation" }) });
  await managerSignature.getByPlaceholder("Name").fill("Matty");
  await managerSignature.getByPlaceholder("Company").fill("Uplands");
  await managerSignature.getByPlaceholder("Position").fill("Site Manager");

  await page.getByRole("button", { name: "Authorise Permit" }).click();
  await expect(page.getByText("AUTHORISED").first()).toBeVisible();
  await expect(page.getByText("Permit authorised").first()).toBeVisible();

  const pdfHref = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  expect(pdfHref).toBeTruthy();
  const response = await page.request.get(pdfHref!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});
