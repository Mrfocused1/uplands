import assert from "node:assert/strict";
import test from "node:test";
import { adminAuthRequiredForEnvironment } from "../lib/auth/adminMode.ts";

test("admin auth is always required in production", () => {
  assert.equal(adminAuthRequiredForEnvironment("production", false), true);
  assert.equal(adminAuthRequiredForEnvironment("production", true), true);
});

test("admin auth can remain optional in local development tests", () => {
  assert.equal(adminAuthRequiredForEnvironment("development", false), false);
  assert.equal(adminAuthRequiredForEnvironment("test", false), false);
  assert.equal(adminAuthRequiredForEnvironment("development", true), true);
});
