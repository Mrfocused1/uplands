import { expect, test } from "@playwright/test";

test("site operations agents run together for the site workspace", async ({ page, request }) => {
  const response = await request.get("/api/admin/sites/newport/agents");
  expect(response.ok()).toBe(true);

  const payload = (await response.json()) as {
    agents: {
      attendance: unknown;
      contractors: unknown;
      handover: unknown;
      timeline: unknown;
      compliance: unknown;
    };
  };

  expect(payload.agents).toHaveProperty("attendance");
  expect(payload.agents).toHaveProperty("contractors");
  expect(payload.agents).toHaveProperty("handover");
  expect(payload.agents).toHaveProperty("timeline");
  expect(payload.agents).toHaveProperty("compliance");

  await page.goto("/admin/sites/newport");
  await expect(page.getByRole("heading", { name: "Site Watch" })).toBeVisible();
  await expect(page.getByText("Operations Agents")).toBeVisible();
  await expect(page.locator("section").filter({ hasText: "Site Watch" })).toContainText("Attendance");
  await expect(page.locator("section").filter({ hasText: "Site Watch" })).toContainText("Compliance");
});
