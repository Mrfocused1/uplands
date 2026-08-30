import { expect, test } from "@playwright/test";

test("admin can sign an operative in and out of a site", async ({ page, request }, testInfo) => {
  test.setTimeout(45_000);

  const unique = `${testInfo.project.name} ${Date.now()}`;
  const contractorName = `Attendance Contractor ${unique}`;
  const operativeName = `Attendance Operative ${unique}`;

  const contractorResponse = await request.post("/api/admin/sites/newport/contractors", {
    data: {
      name: contractorName,
      trade: "Ceilings",
      siteStatus: "ACTIVE",
      primaryContactName: "Attendance Contact",
    },
  });
  expect(contractorResponse.ok()).toBe(true);
  const contractor = (await contractorResponse.json()) as { contractorId: string };

  const operativeResponse = await request.post(`/api/admin/sites/newport/contractors/${contractor.contractorId}/operatives`, {
    data: {
      fullName: operativeName,
      role: "Ceiling fixer",
      inductionStatus: "APPROVED",
      siteStatus: "ACTIVE",
    },
  });
  expect(operativeResponse.ok()).toBe(true);
  const operative = (await operativeResponse.json()) as { operativeId: string };

  await page.goto("/admin/sites/newport");
  await expect(page.getByRole("link", { name: /Open attendance/i })).toHaveAttribute("href", "/admin/sites/newport/attendance");

  await page.goto("/admin/sites/newport/attendance");
  await expect(page.getByRole("heading", { name: "Waitrose Newport" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to admin" })).toHaveAttribute("href", "/admin/sites/newport");
  await page.getByLabel("Operative").selectOption(`${contractor.contractorId}:${operative.operativeId}`);
  await page.getByLabel("Shift").selectOption("NIGHT");
  await page.getByLabel("Notes").fill("Night works attendance test");

  const [signInResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/admin/sites/newport/attendance") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Sign In" }).click(),
  ]);
  expect(signInResponse.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: /Signed In/ })).toContainText("1");
  await expect(page.getByText(operativeName).first()).toBeVisible();
  await expect(page.getByText("APPROVED").first()).toBeVisible();

  await page.goto("/admin/sites/newport");
  const attendanceCard = page.locator("article").filter({ hasText: "Attendance" });
  await expect(attendanceCard).toContainText("1");

  await page.goto(`/admin/sites/newport/attendance?contractorId=${encodeURIComponent(contractor.contractorId)}`);
  await expect(page.getByLabel("Attendance contractor filter")).toHaveValue(contractor.contractorId);
  await expect(page.getByText(operativeName).first()).toBeVisible();

  const [signOutResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/admin/sites/newport/attendance") && response.request().method() === "PATCH"),
    page.getByRole("button", { name: "Sign Out" }).click(),
  ]);
  expect(signOutResponse.ok()).toBe(true);
  await expect(page.getByText("No operatives are currently signed in.")).toBeVisible();
  await expect(page.getByText("SIGNED OUT").first()).toBeVisible();
});
