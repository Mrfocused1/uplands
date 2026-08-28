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

test("admin RAMS page renders cleanly on desktop and mobile", async ({ page }, testInfo) => {
  await page.goto("/admin/rams");

  await expect(page.getByRole("heading", { name: "RAMS" }).first()).toBeVisible();
  if (testInfo.project.name === "Desktop Chrome") {
    await expect(page.getByRole("link", { name: "Inductions" })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "+ Upload RAMS" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoCriticalA11yViolations(page);
});

test("mobile admin navigation exposes RAMS from the submissions area", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "Desktop Chrome", "Mobile navigation is hidden on desktop.");

  await page.goto("/admin/submissions");
  await page.getByLabel("Open admin navigation menu").click();
  await expect(page.locator("details nav").getByRole("link", { name: "Inductions" })).toBeVisible();
  await page.locator("details nav").getByRole("link", { name: "RAMS" }).click();

  await expect(page).toHaveURL(/\/admin\/rams$/);
  await expect(page.getByRole("heading", { name: "RAMS" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("legacy imported RAMS workspace renders PDF pages and highlights evidence", async ({ page }) => {
  await page.route("**/api/admin/rams", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        documents: [
          {
            id: "legacy-ampthill-test",
            title: "Flooring installation",
            siteName: "Newport - 81978",
            contractor: "Ampthill Flooring Limited",
            documentReference: "legacy:ampthill-flooring-waitrose-newport",
            revision: null,
            revisionDate: null,
            fileName: "ampthill-flooring-waitrose-newport-rams.pdf",
            fileSize: 1024,
            mimeType: "application/pdf",
            pageCount: 118,
            processingStatus: "READY",
            processingError: null,
            textExtractionStatus: "EXTRACTED",
            createdAt: "2026-08-28T00:00:00.000Z",
            sectionCount: 10,
            chunkCount: 20,
          },
        ],
      }),
    });
  });
  await page.route("**/api/admin/rams/legacy-ampthill-test/pdf**", (route) =>
    route.fulfill({ contentType: "application/pdf", path: "public/rams/sources/ampthill-flooring-waitrose-newport-rams.pdf" }),
  );
  await page.route("**/api/admin/rams/legacy-ampthill-test/sections", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        sections: [
          { id: "section-1", title: "PPE Requirements", startPage: 10, endPage: 12, sortOrder: 1 },
          { id: "section-2", title: "Asbestos Controls", startPage: 60, endPage: 61, sortOrder: 2 },
        ],
      }),
    }),
  );
  await page.route("**/api/admin/rams/legacy-ampthill-test/search", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            chunkId: "chunk-ppe",
            pageNumber: 10,
            endPageNumber: 10,
            sectionTitle: "PPE Requirements",
            snippet: "Suitable PPE is required for flooring preparation and installation.",
            score: 0.9,
            text: "Suitable PPE is required for flooring preparation and installation.",
            boxes: [{ page_number: 10, x: 70, y: 110, width: 180, height: 20, page_width: 595, page_height: 842 }],
          },
        ],
      }),
    }),
  );

  await page.goto("/admin/rams");
  const uploadedRams = page.locator("section").filter({ has: page.getByRole("heading", { name: "Uploaded RAMS" }) });
  await expect(uploadedRams.getByRole("button", { name: /Ampthill Flooring Limited/ })).toBeVisible();
  await uploadedRams.getByRole("button", { name: /Ampthill Flooring Limited/ }).click();

  await expect(page.locator('canvas[aria-label="Ampthill Flooring Limited RAMS page 1"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Document Information" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Read Summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Completed Review Form" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RAMS REVIEW FORM Front Page" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RAMS REVIEW FORM Back Page" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review Answers" })).toBeVisible();
  await expect(page.getByText("10. Has appropriate PPE been identified?")).toBeVisible();

  await page.getByText("Sections (10)").click();
  await page.getByText("Asbestos Controls").click();
  await page.getByRole("button", { name: "Show Page" }).last().click();
  await expect(page.locator('canvas[aria-label="Ampthill Flooring Limited RAMS page 60"]')).toBeVisible();
  await expect(page.getByText("Unable to load this RAMS PDF.")).toHaveCount(0);

  await page.getByRole("button", { name: /PPE Requirements/ }).first().click();
  await expect(page.getByText("Suitable PPE is required")).toBeVisible();
  await page.getByText("Show in RAMS").first().click();
  await expect(page.locator('canvas[aria-label="Ampthill Flooring Limited RAMS page 10"]')).toBeVisible();
  await expect(page.getByTestId("rams-highlight")).toBeVisible();
});
