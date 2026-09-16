import assert from "node:assert/strict";
import test from "node:test";

import { issueAskSession, verifyAskSession } from "./session.js";

const origin = "https://thinkerqaq.github.io";
const signingValue = "local-test-signing-value-0123456789";

test("Ask session is valid for the issuing origin", async () => {
  const issued = await issueAskSession(signingValue, origin);
  assert.equal(typeof issued.token, "string");
  assert.ok(issued.expiresAt > Date.now() + 19 * 60 * 1000);

  const verified = await verifyAskSession(issued.token, signingValue, origin);
  assert.equal(verified.ok, true);
});

test("Ask session cannot be reused for another origin", async () => {
  const issued = await issueAskSession(signingValue, origin);
  const verified = await verifyAskSession(issued.token, signingValue, "https://example.com");
  assert.equal(verified.ok, false);
});

test("tampering invalidates the Ask session", async () => {
  const issued = await issueAskSession(signingValue, origin);
  const [payload, signature] = issued.token.split(".");
  const changedFirstCharacter = signature.startsWith("A") ? "B" : "A";
  const tampered = `${payload}.${changedFirstCharacter}${signature.slice(1)}`;
  const verified = await verifyAskSession(tampered, signingValue, origin);
  assert.equal(verified.ok, false);
});
