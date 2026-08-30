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

async function createPermit(page: Page, contractor: string, locationOfWork: string, descriptionOfWork: string) {
  await page.locator("form").getByLabel("Contractor").selectOption("__new__");
  await page.getByPlaceholder("New contractor name").fill(contractor);
  await page.getByPlaceholder("Location of work").fill(locationOfWork);
  await page.getByPlaceholder("Description of work").fill(descriptionOfWork);

  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().endsWith("/api/admin/permits") && item.request().method() === "POST"),
    page.getByRole("button", { name: "Create Permit" }).click(),
  ]);
  expect(response.ok()).toBe(true);
  const contractorSelect = page.getByTestId("permit-editor").getByRole("combobox", { name: "Contractor" });
  await expect(contractorSelect).toBeVisible();
  await expect(contractorSelect.locator("option:checked")).toHaveText(contractor);
}

test("admin can create, edit and download a step ladders permit", async ({ page }) => {
  test.setTimeout(45_000);

  const contractor = `Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.locator("header").getByText("UHSF16.01")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to admin" })).toHaveAttribute("href", "/admin/sites/newport");
  await expect(page.locator("form").getByRole("heading", { name: "Step Ladders / Ladders Permit" })).toBeVisible();

  await createPermit(page, contractor, "Back of house stock room", "Inspect ceiling signage using a step ladder.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Step Ladders / Ladders Permit" })).toBeVisible();
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

  await createPermit(page, contractor, "Main distribution board", "Isolate and test circuits for controlled electrical works.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Electrical Permit" })).toBeVisible();
  await expect(page.getByText("Uplands Site Electrician Declaration")).toBeVisible();
  await expect(page.getByText("Are control panels locked off?")).toBeVisible();

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent supervisor been appointed?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("Electrical supervisor: Site Contact");

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

  await createPermit(page, contractor, "Sales floor aisle 4", "Use mobile tower scaffold to access ceiling services.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Mobile Tower Scaffold Permit" })).toBeVisible();
  await expect(page.getByText("Tower System / Components")).toBeVisible();
  await expect(page.getByText("Has the operative produced the relevant PASMA card")).toBeVisible();

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent supervisor been appointed?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("PASMA supervisor: Site Contact");

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

  await createPermit(page, contractor, "External service yard", "Use cherry picker to access high-level external signage.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Cherry Picker / Star 10 Permit" })).toBeVisible();
  await expect(page.getByText("Plant / Harness Records")).toBeVisible();
  await expect(page.getByText("Have the operatives produced the relevant IPAF card")).toBeVisible();

  const rescuePlanQuestion = page.locator(".p-4").filter({ hasText: "Is a rescue plan in place?" });
  await rescuePlanQuestion.getByPlaceholder("Comment").fill("Rescue lead: Site Contact");

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

  await createPermit(page, contractor, "Rear service trench", "Excavate shallow trench for service investigation.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Excavation Permit" })).toBeVisible();
  await expect(page.getByText("Services / Drawings / Materials")).toBeVisible();
  await expect(page.getByText("Atmosphere / Rescue Arrangements")).toBeVisible();
  await expect(page.getByText("Have all services been located and their positions verified?")).toBeVisible();

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

  await createPermit(page, contractor, "Front entrance slab", "Break ground for shallow service inspection trench.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Permit to Dig / Break Ground" })).toBeVisible();
  await expect(page.getByText("Plans / CAT Scanning")).toBeVisible();
  await expect(page.getByText("Services / Ground Controls")).toBeVisible();
  await expect(page.getByText("Have all utility and third-party plans / drawings been provided?")).toBeVisible();

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

  await createPermit(page, contractor, "Plant room sump chamber", "Enter sump chamber to inspect pump controls and clear debris.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Confined Space Permit" })).toBeVisible();
  await expect(page.getByText("Atmosphere / Ventilation Controls")).toBeVisible();
  await expect(page.getByText("Rescue / Emergency Readiness")).toBeVisible();
  await expect(page.getByText("Is there an observer outside the confined space?")).toBeVisible();

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

test("admin can create and authorise a demolition permit", async ({ page }) => {
  test.setTimeout(60_000);

  const contractor = `Demolition Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await choosePermitType(page, "Demolition Permit");
  await expect(page.locator("form").getByRole("heading", { name: "Demolition Permit" })).toBeVisible();

  await createPermit(page, contractor, "Former customer service desk", "Controlled soft strip and demolition of redundant partition.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Demolition Permit" })).toBeVisible();
  await expect(page.getByText("Services / Surveys / Drawings")).toBeVisible();
  await expect(page.getByText("Temporary Works / Waste Controls")).toBeVisible();
  await expect(page.getByText("Has a detailed demolition survey been carried out?")).toBeVisible();

  const supervisorQuestion = page.locator(".p-4").filter({ hasText: "Has a competent supervisor been appointed?" });
  await supervisorQuestion.getByPlaceholder("Comment").fill("Demolition supervisor: Matty");

  const surveyHazardsQuestion = page.locator(".p-4").filter({ hasText: "Has the survey identified possible hazards" });
  await surveyHazardsQuestion.getByPlaceholder("Comment").fill("Survey identifies noise, dust and redundant services.");

  const temporaryWorksQuestion = page.locator(".p-4").filter({ hasText: "Is temporary work required?" });
  await temporaryWorksQuestion.getByPlaceholder("Comment").fill("Temporary support not required for soft strip.");

  await answerAllQuestionsYes(page);
  await selectQuestionAnswer(page, "Is temporary work required?", "NO");

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

test("admin can create and authorise a temporary works permit", async ({ page }) => {
  test.setTimeout(60_000);

  const contractor = `Temporary Works Permit Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await choosePermitType(page, "Temporary Works Permit to Load / Strike");
  await expect(page.locator("form").getByRole("heading", { name: "Temporary Works Permit to Load / Strike" })).toBeVisible();

  await createPermit(page, contractor, "Loading bay temporary support", "Inspect temporary support and authorise controlled loading sequence.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "Temporary Works Permit to Load / Strike" })).toBeVisible();
  await expect(page.getByText("Temporary Works Team")).toBeVisible();
  await expect(page.getByText("Load / Strike Authorisation")).toBeVisible();
  await expect(page.getByText("Has the TWC / TWS checked that the temporary works are in accordance with the design details?")).toBeVisible();

  const twcQuestion = page.locator(".p-4").filter({ hasText: "Has the authorising temporary works coordinator been identified?" });
  await twcQuestion.getByPlaceholder("Comment").fill("TWC/TWS: Site Contact");

  const siteManagerQuestion = page.locator(".p-4").filter({ hasText: "Has the site manager responsible for temporary works erection been identified?" });
  await siteManagerQuestion.getByPlaceholder("Comment").fill("Responsible site manager: Matty");

  const loadTypeQuestion = page.locator(".p-4").filter({ hasText: "Has the authorised load type been confirmed?" });
  await loadTypeQuestion.getByPlaceholder("Comment").fill("Authorised load: concrete.");

  await answerAllQuestionsYes(page);
  await selectQuestionAnswer(page, "Are there any deviations from the drawings?", "NO");

  const submitForReview = page.getByRole("button", { name: "Submit for Review" });
  await expect(submitForReview).toBeEnabled();
  await submitForReview.click();
  await expect(page.getByText("Permit submitted for review").first()).toBeVisible();

  const managerSignature = page.locator("article").filter({ has: page.getByRole("heading", { name: "Uplands Site Manager Responsible for Temporary Works Erection Authorisation" }) });
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

test("admin can create and authorise a PFS clearance certificate", async ({ page }) => {
  test.setTimeout(60_000);

  const contractor = `PFS Clearance Test ${Date.now()}`;

  await page.goto("/admin/sites/newport/permits");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();

  await choosePermitType(page, "PFS Clearance Certificate");
  await expect(page.locator("form").getByRole("heading", { name: "PFS Clearance Certificate" })).toBeVisible();

  await createPermit(page, contractor, "Petrol filling station forecourt", "Low-risk inspection task at the PFS forecourt with controlled access.");
  await expect(page.getByTestId("permit-editor").getByRole("heading", { name: "PFS Clearance Certificate" })).toBeVisible();
  await expect(page.getByText("Task Scope / Clearance Control")).toBeVisible();
  await expect(page.getByText("Permit Specific Details")).toBeVisible();
  await page.getByTestId("permit-editor").getByLabel("Task Risk Level *").selectOption("Low");
  await page.getByTestId("permit-editor").getByLabel("Number of Workers *").fill("2");
  await page.getByTestId("permit-editor").getByLabel("Clearance For *").fill("Forecourt inspection area");
  await expect(page.getByText("Additional Hazards / Precautions")).toBeVisible();
  await expect(page.getByText("Is this clearance certificate limited to today's work")).toBeVisible();

  const hazardsQuestion = page.locator(".p-4").filter({ hasText: "Have any additional hazards beyond those in the RAMS been identified today?" });
  await hazardsQuestion.getByPlaceholder("Comment").fill("No additional hazards identified at start of task.");

  await answerAllQuestionsYes(page);
  await selectQuestionAnswer(page, "Have any additional hazards beyond those in the RAMS been identified today?", "NO");

  const submitForReview = page.getByRole("button", { name: "Submit for Review" });
  await expect(submitForReview).toBeEnabled();
  await submitForReview.click();
  await expect(page.getByText("Permit submitted for review").first()).toBeVisible();

  const managerSignature = page.locator("article").filter({ has: page.getByRole("heading", { name: "Uplands Site Manager Clearance Approval" }) });
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
