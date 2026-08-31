import assert from "node:assert/strict";
import test from "node:test";
import { safeLoginNext } from "../lib/auth/loginRedirect.ts";

test("login redirects home/default/unsafe next values to admin", () => {
  assert.equal(safeLoginNext("/"), "/admin");
  assert.equal(safeLoginNext(""), "/admin");
  assert.equal(safeLoginNext("//evil.example"), "/admin");
  assert.equal(safeLoginNext("/api/admin/permits"), "/admin");
  assert.equal(safeLoginNext("/admin/login"), "/admin");
});

test("login preserves safe internal page next values", () => {
  assert.equal(safeLoginNext("/admin/sites/newport/permits"), "/admin/sites/newport/permits");
  assert.equal(safeLoginNext("/contact"), "/contact");
});
