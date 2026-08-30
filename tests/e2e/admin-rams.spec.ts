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

test("admin opens the site manager portal before workflow areas", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Select Your Site" })).toBeVisible();
  await expect(page.getByLabel("Search Sites")).toBeVisible();
  await expect(page.getByRole("link", { name: /Newport/i })).toBeVisible();

  await page.getByLabel("Open admin navigation menu").click();
  const adminNav = page.locator("details nav");
  await expect(adminNav.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(adminNav.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(adminNav.getByRole("link", { name: "RAMS" })).toHaveCount(0);
  await expect(adminNav.getByRole("link", { name: "Inductions" })).toHaveCount(0);
  await page.getByLabel("Open admin navigation menu").click();

  await expect(page.getByRole("heading", { name: "Choose A Workflow" })).toHaveCount(0);

  await page.getByLabel("Search Sites").fill("newport");
  await expect(page.getByRole("link", { name: /Newport/i })).toBeVisible();
  await page.getByRole("link", { name: /Newport/i }).click();

  await expect(page).toHaveURL(/\/admin\/sites\/newport$/);
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose A Workflow" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Change Site" }).first()).toHaveAttribute("href", "/admin");

  await page.getByLabel("Open admin navigation menu").click();
  await expect(page.locator("details nav").getByRole("link", { name: "RAMS" })).toBeVisible();
  await page.getByLabel("Open admin navigation menu").click();

  await expect(page.getByRole("link", { name: /Open inductions/i })).toHaveAttribute("href", "/admin/sites/newport/forms");
  await expect(page.getByRole("link", { name: /Open RAMS/i })).toHaveAttribute("href", "/admin/sites/newport/rams");
  await expect(page.getByRole("link", { name: /Start form/i })).toHaveAttribute("href", "/form?returnTo=%2Fadmin%2Fsites%2Fnewport%2Fforms");
  await expectNoHorizontalOverflow(page);
  await expectNoCriticalA11yViolations(page);
});

test("admin forms workspace offers inductee and inductor workflows", async ({ page }) => {
  await page.goto("/admin/forms");

  await expect(page.getByRole("heading", { name: "Forms Workspace" })).toBeVisible();
  await page.getByLabel("Open admin navigation menu").click();
  await expect(page.locator("details nav").getByRole("link", { name: "Inductions" })).toHaveAttribute("href", "/admin/forms");
  await page.getByLabel("Open admin navigation menu").click();
  await expect(page.getByRole("heading", { name: "Inductee Form" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inductor Form" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start New Induction" })).toHaveAttribute("href", "/form?returnTo=/admin/forms");
  await expect(page.getByRole("link", { name: "View Filled Inductions" })).toHaveAttribute("href", "/admin/submissions");
  await expect(page.getByRole("link", { name: "Open Induction Records" })).toHaveAttribute("href", "/admin/submissions");
  await expectNoHorizontalOverflow(page);
  await expectNoCriticalA11yViolations(page);
});

test("admin-started induction can return to forms workspace from the wizard", async ({ page }) => {
  await page.goto("/form?returnTo=/admin/forms");

  await expect(page.getByRole("link", { name: "Back to Forms Workspace" })).toHaveAttribute("href", "/admin/forms");
  await expect(page.getByRole("heading", { name: /Site Induction/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoCriticalA11yViolations(page);
});

test("admin RAMS page renders cleanly on desktop and mobile", async ({ page }) => {
  await page.goto("/admin/rams");

  await expect(page.getByRole("heading", { name: "RAMS" }).first()).toBeVisible();
  await page.getByLabel("Open admin navigation menu").click();
  await expect(page.locator("details nav").getByRole("link", { name: "Inductions" })).toBeVisible();
  await page.getByLabel("Open admin navigation menu").click();
  await expect(page.getByRole("button", { name: "+ Upload RAMS" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoCriticalA11yViolations(page);
});

test("site RAMS upload uses the site contractor register", async ({ page, request }, testInfo) => {
  const contractorName = `RAMS Contractor ${testInfo.project.name} ${Date.now()}`;
  const createContractor = await request.post("/api/admin/sites/newport/contractors", {
    data: {
      name: contractorName,
      trade: "Ceilings",
      siteStatus: "ACTIVE",
    },
  });
  expect(createContractor.ok()).toBe(true);

  await page.goto("/admin/sites/newport/rams");
  await page.getByRole("button", { name: "+ Upload RAMS" }).click();

  await expect(page.getByRole("heading", { name: "New RAMS Document" })).toBeVisible();
  await expect(page.getByLabel("Project / Site")).toHaveValue("Waitrose Newport");
  await expect(page.getByLabel("Contractor / Subcontractor")).toContainText(contractorName);
  await page.getByLabel("Contractor / Subcontractor").selectOption({ label: contractorName });
  await expect(page.getByLabel("Contractor / Subcontractor")).toHaveValue((await createContractor.json()).contractorId);
});

test("admin navigation exposes RAMS from the submissions area", async ({ page }) => {
  await page.goto("/admin/submissions");
  await page.getByLabel("Open admin navigation menu").click();
  await expect(page.locator("details nav").getByRole("link", { name: "Inductions" })).toBeVisible();
  await page.locator("details nav").getByRole("link", { name: "RAMS" }).click();

  await expect(page).toHaveURL(/\/admin\/rams$/);
  await expect(page.getByRole("heading", { name: "RAMS" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("legacy imported RAMS workspace renders PDF pages and highlights evidence", async ({ page }) => {
  test.setTimeout(60_000);

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
    route.fulfill({ contentType: "application/pdf", path: "private/rams/sources/ampthill-flooring-waitrose-newport-rams.pdf" }),
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
  await page.route("**/api/admin/rams/legacy-ampthill-test/full-review", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        model: "gpt-5-mini",
        recommendations: [
          {
            questionKey: "q10",
            recommendation: "Yes",
            comment: "PPE is identified in the retrieved RAMS evidence.",
            confidence: "high",
            status: "needs_human_confirmation",
            citations: [
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
  await page.getByRole("button", { name: "Run AI Review" }).click();
  await expect(page.getByRole("heading", { name: "AI Review Recommendations" })).toBeVisible();
  await expect(page.getByText("Human confirmation required")).toBeVisible();

  const ppeReviewAnswer = page.getByTestId("review-evidence-questions-q10");
  await ppeReviewAnswer.getByRole("button", { name: "Show RAMS References" }).click();
  await expect(ppeReviewAnswer.getByText("Suitable PPE is required")).toBeVisible();
  await ppeReviewAnswer.getByText("Show in RAMS").click();
  await expect(page.locator('canvas[aria-label="Ampthill Flooring Limited RAMS page 10"]')).toBeVisible();
  await expect(page.getByTestId("rams-highlight")).toBeVisible();

  await page.getByText("Sections (10)").click();
  await page.getByText("Asbestos Controls").click();
  await page.getByRole("button", { name: "Show Page" }).last().click();
  await expect(page.locator('canvas[aria-label="Ampthill Flooring Limited RAMS page 60"]')).toBeVisible();
  await expect(page.getByText("Unable to load this RAMS PDF.")).toHaveCount(0);

  const searchRams = page.getByRole("heading", { name: "Search RAMS" }).locator("xpath=ancestor::section[1]");
  await searchRams.getByRole("button", { name: /^PPE Requirements \+$/ }).click();
  await expect(searchRams.getByText("Suitable PPE is required").first()).toBeVisible();
  await searchRams.getByText("Show in RAMS").first().click();
  await expect(page.locator('canvas[aria-label="Ampthill Flooring Limited RAMS page 10"]')).toBeVisible();
  await expect(page.getByTestId("rams-highlight")).toBeVisible();
});
