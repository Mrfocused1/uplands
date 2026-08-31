import { expect, test } from "@playwright/test";

const signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAO+/p9sAAAAASUVORK5CYII=";

test("admin can manage contractors inside a site workspace", async ({ page }, testInfo) => {
  test.setTimeout(75_000);

  const contractor = `Contractor Register ${testInfo.project.name} ${Date.now()}`;

  await page.goto("/admin/sites/newport");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open contractors/i })).toHaveAttribute("href", "/admin/sites/newport/contractors");

  await page.goto("/admin/sites/newport/contractors");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to admin" })).toHaveAttribute("href", "/admin/sites/newport");

  await page.getByLabel("Open admin navigation menu").click();
  await expect(page.locator("details nav").getByRole("link", { name: "Contractors" })).toBeVisible();
  await page.getByLabel("Open admin navigation menu").click();

  const contractorForm = page.locator("form").filter({ has: page.getByRole("button", { name: /Add Contractor|Save Contractor/i }) });
  await contractorForm.getByRole("button", { name: "New" }).click();
  await contractorForm.getByLabel("Company Name").fill(contractor);
  await contractorForm.getByLabel("Trade / Work Package").fill("Fire stopping");
  await contractorForm.getByLabel("Primary Contact").fill("Site Contact");
  await contractorForm.getByLabel("Email").fill("site.contact@example.com");
  await contractorForm.getByLabel("Phone").fill("07700 900123");

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/admin/sites/newport/contractors") && response.request().method() === "POST"),
    contractorForm.getByRole("button", { name: "Add Contractor" }).click(),
  ]);
  expect(createResponse.ok()).toBe(true);

  await page.getByPlaceholder("Search contractors").fill(contractor);
  await expect(page.getByRole("button", { name: new RegExp(contractor) })).toContainText("Fire stopping");
  await expect(page.getByRole("heading", { name: "Recent Contractor Activity" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Operatives/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Induction Invites/ })).toBeVisible();
  await expect(page.getByText("Contractor added")).toBeVisible();

  const profileLink = page.getByRole("link", { name: /Open Profile/ });
  await expect(profileLink).toHaveAttribute("href", new RegExp(`/admin/sites/newport/contractors/[^/]+$`));
  await Promise.all([
    page.waitForURL(/\/admin\/sites\/newport\/contractors\/[^/?#]+$/),
    profileLink.click(),
  ]);
  await expect(page.getByRole("heading", { level: 1, name: contractor })).toBeVisible();
  await expect(page.getByText("Contractor Workspace")).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage contractor" })).toHaveAttribute("href", /\/admin\/sites\/newport\/contractors\?contractorId=.+/);
  await expect(page.getByRole("link", { name: /Permits/ }).first()).toHaveAttribute("href", /\/admin\/sites\/newport\/permits\?contractorId=.+/);
  await expect(page.getByRole("link", { name: /RAMS/ }).first()).toHaveAttribute("href", /\/admin\/sites\/newport\/rams\?contractorId=.+/);
  await expect(page.getByRole("link", { name: /Linked RAMS/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Missing RAMS/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open permits" })).toHaveAttribute("href", /\/admin\/sites\/newport\/permits\?contractorId=.+/);
  await expect(page.getByRole("link", { name: "Open RAMS" })).toHaveAttribute("href", /\/admin\/sites\/newport\/rams\?contractorId=.+/);
  await expect(page.getByRole("heading", { name: "Current Workforce" })).toBeVisible();
  await page.getByRole("link", { name: "Manage contractor" }).click();
  await expect(page).toHaveURL(/\/admin\/sites\/newport\/contractors\?contractorId=.+/);
  await expect(page.getByRole("heading", { name: "Recent Contractor Activity" })).toBeVisible();

  const invitedName = `Invited Operative ${testInfo.project.name} ${Date.now()}`;
  const invitationForm = page.locator("form").filter({ has: page.getByRole("button", { name: /Create Invite/i }) });
  await invitationForm.getByLabel("Operative Name").fill(invitedName);
  await invitationForm.getByLabel("Operative Email").fill("invited@example.com");
  await invitationForm.getByLabel("Phone").fill("07700 900555");
  await invitationForm.getByLabel("Role / Trade").fill("Electrician");

  const [inviteResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes(`/api/admin/sites/newport/contractors/`) && response.url().includes("/invitations") && response.request().method() === "POST"),
    invitationForm.getByRole("button", { name: "Create Invite" }).click(),
  ]);
  expect(inviteResponse.ok()).toBe(true);
  const invite = (await inviteResponse.json()) as { inviteUrl: string; mailtoHref: string };
  expect(invite.mailtoHref).toContain("mailto:invited%40example.com");
  await expect(page.getByText("Invite Link Created")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Email" })).toHaveAttribute("href", invite.mailtoHref);
  await expect(page.getByText(invitedName).first()).toBeVisible();

  const batchNameOne = `Batch Operative One ${testInfo.project.name} ${Date.now()}`;
  const batchNameTwo = `Batch Operative Two ${testInfo.project.name} ${Date.now()}`;
  await invitationForm.getByLabel("Batch Invites").fill(`${batchNameOne}, batch.one@example.com, 07700 900556, Labourer\n${batchNameTwo}, batch.two@example.com, 07700 900557, Supervisor`);
  const [batchInviteResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes(`/api/admin/sites/newport/contractors/`) && response.url().includes("/invitations") && response.request().method() === "POST"),
    invitationForm.getByRole("button", { name: "Create Batch Invites" }).click(),
  ]);
  expect(batchInviteResponse.ok()).toBe(true);
  const batchInvites = (await batchInviteResponse.json()) as { invitations: unknown[]; inviteUrls: string[]; mailtoHrefs: string[] };
  expect(batchInvites.invitations).toHaveLength(2);
  expect(batchInvites.inviteUrls).toHaveLength(2);
  expect(batchInvites.mailtoHrefs[0]).toContain("batch.one%40example.com");
  await expect(page.getByText("2 induction invites created.")).toBeVisible();
  await expect(page.getByText("Batch Invite Links Created")).toBeVisible();
  await expect(page.getByText(batchNameOne).first()).toBeVisible();
  await expect(page.getByText(batchNameTwo).first()).toBeVisible();

  await page.evaluate(() => window.localStorage.clear());
  await page.goto(new URL(invite.inviteUrl).pathname);
  await expect(page.getByText(/Invited induction/i)).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue(invitedName);
  await expect(page.getByLabel("Contact number")).toHaveValue("07700 900555");
  await expect(page.getByLabel("Company name")).toHaveValue(contractor);
  await expect(page.getByLabel("Occupation")).toHaveValue("Electrician");

  await page.goto("/admin/sites/newport/contractors");
  await page.getByPlaceholder("Search contractors").fill(contractor);
  await page.getByRole("button", { name: new RegExp(contractor) }).click();
  const inviteRow = page.locator(".grid").filter({ hasText: invitedName }).last();
  await inviteRow.getByRole("button", { name: "Revoke" }).click();
  await expect(inviteRow).toContainText("REVOKED");

  await contractorForm.getByLabel("Site Status").selectOption("INACTIVE");
  await contractorForm.getByLabel("Phone").fill("07700 900456");

  const [updateResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/admin/sites/newport/contractors") && response.request().method() === "PATCH"),
    contractorForm.getByRole("button", { name: "Save Contractor" }).click(),
  ]);
  expect(updateResponse.ok()).toBe(true);

  await expect(contractorForm.getByLabel("Site Status")).toHaveValue("INACTIVE");
  await expect(contractorForm.getByLabel("Phone")).toHaveValue("07700 900456");
  await expect(page.getByRole("button", { name: new RegExp(contractor) })).toContainText("INACTIVE");

  const operativeName = `Operative ${testInfo.project.name} ${Date.now()}`;
  const operativeForm = page.locator("form").filter({ has: page.getByRole("button", { name: /Add Operative|Save Operative/i }) });
  await operativeForm.getByLabel("Full Name").fill(operativeName);
  await operativeForm.getByLabel("Role / Trade").fill("Ceiling fixer");
  await operativeForm.getByLabel("Induction").selectOption("PENDING_REVIEW");
  await operativeForm.getByLabel("Email").fill("operative@example.com");
  await operativeForm.getByLabel("Phone").fill("07700 900789");
  await operativeForm.getByLabel("CSCS Card").fill("CSCS-12345");

  const [createOperativeResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes(`/api/admin/sites/newport/contractors/`) && response.url().includes("/operatives") && response.request().method() === "POST"),
    operativeForm.getByRole("button", { name: "Add Operative" }).click(),
  ]);
  expect(createOperativeResponse.ok()).toBe(true);

  await expect(page.getByRole("button", { name: new RegExp(operativeName) })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(operativeName) })).toContainText("PENDING REVIEW");
  await expect(page.getByRole("button", { name: new RegExp(contractor) })).toContainText(/Operatives\s*1/);

  await operativeForm.getByLabel("Induction").selectOption("APPROVED");
  await operativeForm.getByLabel("Phone").fill("07700 900790");

  const [updateOperativeResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes(`/api/admin/sites/newport/contractors/`) && response.url().includes("/operatives") && response.request().method() === "PATCH"),
    operativeForm.getByRole("button", { name: "Save Operative" }).click(),
  ]);
  expect(updateOperativeResponse.ok()).toBe(true);

  await expect(operativeForm.getByLabel("Induction")).toHaveValue("APPROVED");
  await expect(operativeForm.getByLabel("Phone")).toHaveValue("07700 900790");
  await expect(page.getByRole("button", { name: new RegExp(operativeName) })).toContainText("APPROVED");
});

test("submitted inductions appear as contractor operatives", async ({ page, request }, testInfo) => {
  test.setTimeout(45_000);

  const unique = `${testInfo.project.name} ${Date.now()}`;
  const fullName = `Inducted Operative ${unique}`;
  const companyName = `Induction Contractor ${unique}`;

  const submitResponse = await request.post("/api/induction/submit", {
    data: {
      fullName,
      contactNumber: "07700 900123",
      companyName,
      occupation: "Electrician",
      cscsCardNumber: "CSCS-12345",
      cscsExpiry: "2027-08-30",
      confirmedRamsDeclaration: true,
      confirmedSiteRulesDeclaration: true,
      confirmedPpeDeclaration: true,
      inducteeSignature: signature,
      declarationDate: "2026-08-30",
      siteName: "Newport - 81978",
      uploadedDocuments: [],
    },
  });
  expect(submitResponse.ok()).toBe(true);
  const submission = (await submitResponse.json()) as { id: string; reference: string };

  await page.goto("/admin/sites/newport/contractors");
  await page.getByPlaceholder("Search contractors").fill(companyName);
  await expect(page.getByRole("button", { name: new RegExp(companyName) })).toContainText(/Operatives\s*1/);
  await page.getByRole("button", { name: new RegExp(companyName) }).click();
  await expect(page.getByRole("button", { name: new RegExp(fullName) })).toContainText("PENDING REVIEW");
  await expect(page.getByRole("button", { name: new RegExp(fullName) })).toContainText(submission.reference);

  const reviewResponse = await request.patch(`/api/admin/submissions/${submission.id}`, {
    data: { printReviewStatus: "ready" },
  });
  expect(reviewResponse.ok()).toBe(true);

  await page.reload();
  await page.getByPlaceholder("Search contractors").fill(companyName);
  await page.getByRole("button", { name: new RegExp(companyName) }).click();
  await expect(page.getByRole("button", { name: new RegExp(fullName) })).toContainText("APPROVED");
});
