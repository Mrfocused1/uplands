import { expect, type Page, test } from "@playwright/test";

async function answerAllQuestionsYes(page: Page) {
  const questionRows = page.getByTestId("permit-editor").locator(".divide-y.divide-zinc-200.border.border-zinc-200 > div").filter({ has: page.getByRole("button", { name: "YES" }) });
  await expect(questionRows.first()).toBeVisible();

  const questionCount = await questionRows.count();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (let index = 0; index < questionCount; index += 1) {
      const yesButton = questionRows.nth(index).getByRole("button", { name: "YES" });
      const className = await yesButton.getAttribute("class");
      if (!className?.includes("bg-uplands-magenta")) {
        await yesButton.click();
        await expect(yesButton).toHaveClass(/bg-uplands-magenta/);
      }
    }

    const selectedCount = await questionRows.locator("button.bg-uplands-magenta").filter({ hasText: "YES" }).count();
    if (selectedCount === questionCount) return;
  }

  await expect(questionRows.locator("button.bg-uplands-magenta").filter({ hasText: "YES" })).toHaveCount(questionCount);
}

async function choosePermitType(page: Page, name: string) {
  const permitTypeCard = page.locator("fieldset").filter({ hasText: "Permit Type" }).getByRole("button", { name: new RegExp(name) });
  await permitTypeCard.click();
  await expect(permitTypeCard).toHaveAttribute("aria-pressed", "true");
}

test("admin can create, edit and download a step ladders permit", async ({ page }) => {
  test.setTimeout(45_000);

  const contractor = `Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.locator("header").getByText("UHSF16.01")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to admin" })).toHaveAttribute("href", "/admin/sites/newport");
  await expect(page.locator("form").getByRole("heading", { name: "Step Ladders / Ladders Permit" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("Back of house stock room");
  await page.getByPlaceholder("Description of work").fill("Inspect ceiling signage using a step ladder.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Step Ladders / Ladders Permit" })).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);
  await expect(page.getByText("Permit created").first()).toBeVisible();

  await answerAllQuestionsYes(page);

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

  await choosePermitType(page, "Electrical Permit");
  await expect(page.locator("form").getByRole("heading", { name: "Electrical Permit" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("Main distribution board");
  await page.getByPlaceholder("Description of work").fill("Isolate and test circuits for controlled electrical works.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Electrical Permit" })).toBeVisible();
  await expect(page.getByText("Uplands Site Electrician Declaration")).toBeVisible();
  await expect(page.getByText("Are control panels locked off?")).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent supervisor been appointed?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("Electrical supervisor: Paul Bridges");

  const isolationQuestion = page.locator(".p-4").filter({ hasText: "Is the apparatus dead and isolated from supply" });
  await isolationQuestion.getByPlaceholder("Comment").fill("Isolated at DB-01 and DB-02.");

  await answerAllQuestionsYes(page);

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

test("admin can create and authorise a mobile tower scaffold permit", async ({ page }) => {
  test.setTimeout(45_000);

  const contractor = `Tower Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await choosePermitType(page, "Mobile Tower Scaffold Permit");
  await expect(page.locator("form").getByRole("heading", { name: "Mobile Tower Scaffold Permit" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("Sales floor aisle 4");
  await page.getByPlaceholder("Description of work").fill("Use mobile tower scaffold to access ceiling services.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Mobile Tower Scaffold Permit" })).toBeVisible();
  await expect(page.getByText("Tower System / Components")).toBeVisible();
  await expect(page.getByText("Has the operative produced the relevant PASMA card")).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent supervisor been appointed?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("PASMA supervisor: Paul Bridges");

  await answerAllQuestionsYes(page);

  const agrQuestion = page.locator(".p-4").filter({ hasText: "If the mobile tower is not an AGR system" });
  const notApplicableButton = agrQuestion.getByRole("button", { name: "N/A" });
  await notApplicableButton.click();
  await expect(notApplicableButton).toHaveClass(/bg-uplands-magenta/);

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

test("admin can create and authorise a cherry picker permit", async ({ page }) => {
  test.setTimeout(45_000);

  const contractor = `Cherry Picker Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await choosePermitType(page, "Cherry Picker / Star 10 Permit");
  await expect(page.locator("form").getByRole("heading", { name: "Cherry Picker / Star 10 Permit" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("External service yard");
  await page.getByPlaceholder("Description of work").fill("Use cherry picker to access high-level external signage.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Cherry Picker / Star 10 Permit" })).toBeVisible();
  await expect(page.getByText("Plant / Harness Records")).toBeVisible();
  await expect(page.getByText("Have the operatives produced the relevant IPAF card")).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);

  const rescuePlanQuestion = page.locator(".p-4").filter({ hasText: "Is a rescue plan in place?" });
  await rescuePlanQuestion.getByPlaceholder("Comment").fill("Rescue lead: Paul Bridges");

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent appointed supervisor been identified?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("MEWP supervisor: Matty");

  await answerAllQuestionsYes(page);

  const adverseWeatherQuestion = page.locator(".p-4").filter({ hasText: "Are adverse weather conditions present or forecast?" });
  const noButton = adverseWeatherQuestion.getByRole("button", { name: "NO" });
  await noButton.click();
  await expect(noButton).toHaveClass(/bg-uplands-magenta/);

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
