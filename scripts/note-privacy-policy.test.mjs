import assert from "node:assert/strict";
import test from "node:test";

import { auditPublicNotePrivacy } from "./assert-note-privacy.mjs";
import {
  autoImportPrivacyReason,
  neverPublishSourceReason,
  reviewRequiredSourceReason,
  semanticPrivacyReason,
} from "./note-privacy-policy.mjs";

test("blocks broad automatic imports from personal VNote roots", () => {
  assert.match(autoImportPrivacyReason("Others"), /^auto-import-denied:/);
  assert.match(autoImportPrivacyReason("Others/摄影"), /^auto-import-denied:/);
  assert.match(autoImportPrivacyReason("Interview/面经2025.md"), /^auto-import-denied:/);
  assert.match(autoImportPrivacyReason("公司/项目.md"), /^auto-import-denied:/);
  assert.equal(autoImportPrivacyReason("Golang"), undefined);
});

test("never publishes known personal source records as Notes", () => {
  assert.ok(neverPublishSourceReason("Others/经济/保险学/商业保险.md"));
  assert.ok(neverPublishSourceReason("Others/心理学/认知行为疗法/消极情绪日志.md"));
  assert.ok(neverPublishSourceReason("Others/两性/恋爱复盘.md"));
  assert.ok(neverPublishSourceReason("Others/医学/体检/体检.md"));
  assert.ok(neverPublishSourceReason("Interview/面经2025.md"));
  assert.equal(neverPublishSourceReason("Others/摄影/摄影.md"), undefined);
});

test("requires an explicit policy review for borderline personal notes", () => {
  assert.equal(reviewRequiredSourceReason("Others/经济/投资学/如何理财.md"), undefined);
  assert.equal(
    reviewRequiredSourceReason("Others/哲学/人生规划.md"),
    "privacy-review-required",
  );
  assert.equal(
    reviewRequiredSourceReason("Others/经济/保险学/公积金.md"),
    "privacy-review-required",
  );
});

test("detects obvious semantic privacy even when source paths are missing", () => {
  assert.equal(
    semanticPrivacyReason("## 10. 我的保单\n\n### 10.1 本人"),
    "personal-insurance-section",
  );
  assert.equal(
    semanticPrivacyReason("# 消极情绪日志\n\n今天的情绪记录"),
    "personal-emotion-diary",
  );
  assert.equal(
    semanticPrivacyReason("附件：attachments/商业保险/自己/example.pdf"),
    "sensitive-personal-attachment",
  );
  assert.equal(
    semanticPrivacyReason("### Offer\n32K，3个月试用期，公积金 5%"),
    "personal-compensation-record",
  );
  assert.equal(semanticPrivacyReason("## CAS\ncompare and swap"), undefined);
});

test("current public Notes and translations pass the privacy policy", async () => {
  const violations = await auditPublicNotePrivacy();
  assert.deepEqual(violations, []);
});
