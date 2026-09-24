import assert from "node:assert/strict";
import test from "node:test";

import { auditText } from "./assert-public-content-safety.mjs";

test("blocks high-confidence credentials without printing their values", () => {
  const findings = auditText(
    [
      "token: ghp_1234567890abcdefghijklmnopqrst",
      "-----BEGIN PRIVATE KEY-----",
    ].join("\n"),
    { file: "example.md" },
  );

  assert.deepEqual(
    findings.map(item => [item.severity, item.rule, item.file]),
    [
      ["error", "private-key", "example.md"],
      ["error", "github-token", "example.md"],
    ],
  );
});

test("ignores obvious secret placeholders", () => {
  const findings = auditText(
    "token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nkey: AKIAIOSFODNN7EXAMPLE",
    { file: "example.md" },
  );

  assert.equal(findings.filter(item => item.severity === "error").length, 0);
});

test("reports likely PII and private network data as warnings", () => {
  const findings = auditText(
    [
      "owner@example.com",
      "real.person@company.dev",
      "13812345678",
      "11010519491231002X",
      "http://192.168.1.20",
      "service.foo.internal",
    ].join("\n"),
    { file: "example.md" },
  );

  assert.deepEqual(
    findings.map(item => [item.severity, item.rule]),
    [
      ["warning", "email"],
      ["warning", "cn-mobile"],
      ["warning", "cn-id-card"],
      ["warning", "private-ipv4"],
      ["warning", "internal-hostname"],
    ],
  );
});

test("supports explicit per-rule review exceptions", () => {
  const findings = auditText(
    "<!-- public-audit: allow email -->\nreal.person@company.dev",
    { file: "example.md" },
  );

  assert.equal(findings.length, 0);
});
