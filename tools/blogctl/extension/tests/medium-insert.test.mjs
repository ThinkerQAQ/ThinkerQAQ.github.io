import assert from "node:assert/strict";
import test from "node:test";
import { validMediumEditorTask, insertMediumImageInPage, verifyMediumDraftInPage } from "../medium-insert.js";

test("BlogCTL image insertion queue accepts only authorized draft and raster markers", () => {
  const source = {
    id: "a".repeat(32), draftId: "abcdef123456", mode: "insert",
    marker: "[BLOGCTL_IMAGE_001]", filename: "diagram-01.png",
    mimeType: "image/png", base64: "iVBORw0KGgo=",
  };
  assert.equal(validMediumEditorTask(source), true);
  for (const invalid of [
    { ...source, marker: "[IMAGE 01]" },
    { ...source, draftId: "../secret" },
    { ...source, filename: "../../secret.png" },
    { ...source, mimeType: "image/svg+xml" },
    { ...source, base64: "" },
  ]) assert.equal(validMediumEditorTask(invalid), false);
  assert.equal(validMediumEditorTask({
    id: "a".repeat(32), mode: "verify", draftId: "abcdef123456", expectedImages: 42,
  }), true);
});

test("Browser-editor image insertion never attempts changes on another site", async () => {
  globalThis.location = { origin: "https://not-medium.example", pathname: "/p/abcdef123456/edit" };
  try {
    const result = await insertMediumImageInPage("AAAA", "image/png", "diagram.png",
      "abcdef123456", "[BLOGCTL_IMAGE_001]");
    assert.match(result.error, /validation/);
  } finally { delete globalThis.location; }
});

test("Browser image verification never trusts an unrelated draft", () => {
  globalThis.location = { origin: "https://medium.com", pathname: "/p/otherstory/edit" };
  try {
    const result = verifyMediumDraftInPage("abcdef123456", 42);
    assert.match(result.error, /expected Medium draft/);
  } finally { delete globalThis.location; }
});
