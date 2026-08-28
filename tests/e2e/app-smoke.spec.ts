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

test("admin submissions list API does not expose flattened print data", async ({ request }) => {
  const response = await request.get("/api/admin/submissions");
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  const first = payload.submissions?.[0] ?? {};

  expect(first).not.toHaveProperty("searchText");
  expect(first).not.toHaveProperty("printData");
  expect(JSON.stringify(first)).not.toContain("data:image/png;base64");
});

test("public induction APIs reject malformed input with validation errors", async ({ request }) => {
  const submit = await request.post("/api/induction/submit", { data: null });
  expect(submit.status()).toBe(400);
  await expect(submit.json()).resolves.toHaveProperty("error");

  const pdf = await request.post("/api/induction/pdf", { data: null });
  expect(pdf.status()).toBe(400);
  await expect(pdf.json()).resolves.toHaveProperty("error");
});

test("legacy RAMS files are not served from public static URLs", async ({ request }) => {
  const response = await request.get("/rams/sources/ampthill-flooring-waitrose-newport-rams.pdf");
  expect(response.status()).toBe(404);
});

test("edit images shows loading states while the PDF preview and edit pages load", async ({ page }) => {
  await page.route("**/api/admin/edit-images/*/source", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.route("**/edit-images/waitrose-balham/*.png", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });

  await page.goto("/edit-images");
  await page.getByRole("button", { name: /Waitrose Balham/i }).click();

  await expect(page.getByText("Loading PDF")).toBeVisible();
  await expect(page.getByTitle(/Waitrose Balham/i)).toBeVisible();

  await page.getByRole("button", { name: "Edit Pages 3-5" }).click();
  await expect(page.getByText("Loading editable pages")).toBeVisible();
  await expect(page.getByLabel("Page 3 area 1")).toBeVisible();
});

test("induction flow can submit a minimal completed induction", async ({ page }) => {
  await page.route("**/api/induction/submit", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "test-submission", reference: "UHSF-TEST" }),
    }),
  );

  await page.goto("/form");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByLabel("Full name").fill("Alex Smith");
  await page.getByLabel("Contact number").fill("07700 900000");
  await page.getByLabel("Company name").fill("Example Ltd");
  await page.getByRole("button", { name: /Continue/i }).click();

  for (let index = 0; index < 12; index += 1) {
    const body = await page.locator("body").innerText();
    if (body.includes("Confirm, sign and date")) break;
    const skip = page.getByRole("button", { name: /Skip/i }).last();
    const cont = page.getByRole("button", { name: /Continue/i }).last();
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else if (await cont.isVisible().catch(() => false)) await cont.click();
    await page.waitForTimeout(100);
  }

  await expect(page.getByRole("heading", { name: "Confirm, sign and date" })).toBeVisible();
  const declarations = page.locator("button").filter({ hasText: /I confirm|I agree/i });
  for (let index = 0; index < 3; index += 1) await declarations.nth(index).click();

  const canvas = page.locator("canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 40, box!.y + 40);
  await page.mouse.down();
  await page.mouse.move(box!.x + 220, box!.y + 90, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText("Signature confirmed")).toBeVisible();

  await page.getByRole("button", { name: /Continue/i }).last().click();
  await expect(page.getByRole("heading", { name: "Review Site Induction" })).toBeVisible();
  await page.getByRole("button", { name: /Submit induction/i }).click();
  await expect(page.getByText("UHSF-TEST")).toBeVisible();
});
