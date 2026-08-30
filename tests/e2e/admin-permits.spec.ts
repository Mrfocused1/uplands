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

async function selectQuestionAnswer(page: Page, questionText: string, answer: "YES" | "NO" | "N/A") {
  const question = page.locator(".p-4").filter({ hasText: questionText });
  const button = question.getByRole("button", { name: answer });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await button.click();
    try {
      await expect(button).toHaveClass(/bg-uplands-magenta/, { timeout: 3000 });
      return;
    } catch (caught) {
      if (attempt === 2) throw caught;
    }
  }
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

  await selectQuestionAnswer(page, "If the mobile tower is not an AGR system", "N/A");

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

  await selectQuestionAnswer(page, "Are adverse weather conditions present or forecast?", "NO");

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

  const pdfHref = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  expect(pdfHref).toBeTruthy();
  const response = await page.request.get(pdfHref!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("admin can create and authorise an excavation permit", async ({ page }) => {
  test.setTimeout(60_000);

  const contractor = `Excavation Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await choosePermitType(page, "Excavation Permit");
  await expect(page.locator("form").getByRole("heading", { name: "Excavation Permit" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("Rear service trench");
  await page.getByPlaceholder("Description of work").fill("Excavate shallow trench for service investigation.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Excavation Permit" })).toBeVisible();
  await expect(page.getByText("Services / Drawings / Materials")).toBeVisible();
  await expect(page.getByText("Atmosphere / Rescue Arrangements")).toBeVisible();
  await expect(page.getByText("Have all services been located and their positions verified?")).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent supervisor been appointed?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("Excavation supervisor: Matty");

  const servicesQuestion = page.locator(".p-4").filter({ hasText: "Have all services been located and their positions verified?" });
  await servicesQuestion.getByPlaceholder("Comment").fill("Drawing UCB-EX-01 checked and CAT scan completed.");

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

  const pdfHref = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  expect(pdfHref).toBeTruthy();
  const response = await page.request.get(pdfHref!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("admin can create and authorise a permit to dig / break ground", async ({ page }) => {
  test.setTimeout(60_000);

  const contractor = `Permit To Dig Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await choosePermitType(page, "Permit to Dig / Break Ground");
  await expect(page.locator("form").getByRole("heading", { name: "Permit to Dig / Break Ground" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("Front entrance slab");
  await page.getByPlaceholder("Description of work").fill("Break ground for shallow service inspection trench.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Permit to Dig / Break Ground" })).toBeVisible();
  await expect(page.getByText("Plans / CAT Scanning")).toBeVisible();
  await expect(page.getByText("Services / Ground Controls")).toBeVisible();
  await expect(page.getByText("Have all utility and third-party plans / drawings been provided?")).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);

  const catScanQuestion = page.locator(".p-4").filter({ hasText: "Has a CAT scan of the area taken place and been recorded?" });
  await catScanQuestion.getByPlaceholder("Comment").fill("CAT scan logged against entrance slab work pack.");

  const gasElectricQuestion = page.locator(".p-4").filter({ hasText: "Have electricity or gas services been identified as present within 500mm" });
  await gasElectricQuestion.getByPlaceholder("Comment").fill("Known electrical duct marked. Hand-dig rule briefed.");

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

  const pdfHref = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  expect(pdfHref).toBeTruthy();
  const response = await page.request.get(pdfHref!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("admin can create and authorise a confined space permit", async ({ page }) => {
  test.setTimeout(60_000);

  const contractor = `Confined Space Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await choosePermitType(page, "Confined Space Permit");
  await expect(page.locator("form").getByRole("heading", { name: "Confined Space Permit" })).toBeVisible();

  await page.getByPlaceholder("Contractor").fill(contractor);
  await page.getByPlaceholder("Location of work").fill("Plant room sump chamber");
  await page.getByPlaceholder("Description of work").fill("Enter sump chamber to inspect pump controls and clear debris.");
  await page.getByRole("button", { name: "Create Permit" }).click();

  await expect(page.getByText(contractor).first()).toBeVisible();
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Confined Space Permit" })).toBeVisible();
  await expect(page.getByText("Atmosphere / Ventilation Controls")).toBeVisible();
  await expect(page.getByText("Rescue / Emergency Readiness")).toBeVisible();
  await expect(page.getByText("Is there an observer outside the confined space?")).toBeVisible();
  await expect(page.getByLabel("Contractor")).toHaveValue(contractor);

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent supervisor been appointed?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("Confined-space supervisor: Matty");

  const gasTestQuestion = page.locator(".p-4").filter({ hasText: "Are oxygen or gas tests needed?" });
  await gasTestQuestion.getByPlaceholder("Comment").fill("Pre-entry gas test and continuous monitor required.");

  await answerAllQuestionsYes(page);
  await selectQuestionAnswer(page, "Do emergency services need to be contacted?", "NO");

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

  const pdfHref = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  expect(pdfHref).toBeTruthy();
  const response = await page.request.get(pdfHref!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});
