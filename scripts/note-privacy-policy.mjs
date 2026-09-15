function normalizeSourcePath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+|\/+$/g, "");
}

function isAtOrBelow(sourcePath, prefix) {
  const source = normalizeSourcePath(sourcePath);
  const root = normalizeSourcePath(prefix);
  return source === root || source.startsWith(`${root}/`);
}

// These roots may contain useful raw material, but they must never be added to
// PUBLIC_NOTEBOOKS. Anything public from Others/ must be selected deliberately
// as an individual reviewed note/category rather than imported wholesale.
export const AUTO_IMPORT_DENIED_SOURCE_ROOTS = Object.freeze([
  "Others",
  "Interview",
  "公司",
]);

// Entire source subtrees that are private by default. They are raw personal
// records, not public knowledge notes. If material from them is ever useful for
// an Article, rewrite it into a separate public artifact instead of publishing
// the original Note.
export const NEVER_PUBLISH_SOURCE_PREFIXES = Object.freeze([
  "Interview",
  "公司",
  "Others/医学/体检",
  "Others/医学/看病",
  "Others/心理学/抑郁",
  "Others/心理学/焦虑",
]);

// Individual VNote files that contain identity, relationship, family, health,
// insurance, or machine-profile information that must never be published as
// Notes. Keep this list path-based: do not put real names, policy numbers, or
// other sensitive values into the repository just to detect them.
export const NEVER_PUBLISH_SOURCE_PATHS = new Set([
  "Others/两性/一个还未过保质期的大男孩的自我介绍.md",
  "Others/两性/个人相亲模版.md",
  "Others/两性/恋爱复盘.md",
  "Others/两性/相亲.md",
  "Others/两性/爱情观.md",
  "Others/心理学/认知行为疗法/消极情绪日志.md",
  "Others/经济/保险学/商业保险.md",
  "Others/软件/xyplorer.md",
]);

// These files are not automatically private, but they are personal enough that
// publishing them requires an explicit privacy-review decision in this policy.
export const REVIEW_REQUIRED_SOURCE_PATHS = new Set([
  "Others/哲学/人生规划.md",
  "Others/经济/保险学/社保.md",
  "Others/经济/保险学/公积金.md",
  "Others/经济/投资学/如何理财.md",
  "Others/软件/aria2.md",
]);

// Explicitly reviewed exceptions. Adding an entry here should be a conscious
// code-review action, not something the importer does automatically.
export const PRIVACY_REVIEWED_SOURCE_PATHS = new Set([
  "Others/经济/投资学/如何理财.md",
]);

// Defense in depth for manually curated files. Source-path rules are the main
// boundary; these patterns catch obvious personal material even if somebody
// copies it into an otherwise safe source file or forgets the original path.
export const SEMANTIC_PRIVACY_PATTERNS = Object.freeze([
  {
    reason: "personal-insurance-section",
    pattern: /^#{1,6}\s*(?:\d+(?:\.\d+)*\.?\s*)?(?:我的保单|My Insurance Policies|My Policies)\s*$/im,
  },
  {
    reason: "personal-emotion-diary",
    pattern: /(?:消极情绪日志|Negative Emotion (?:Log|Diary))/i,
  },
  {
    reason: "personal-dating-record",
    pattern: /(?:个人相亲模[板版]|恋爱复盘|相亲复盘)/i,
  },
  {
    reason: "sensitive-personal-attachment",
    pattern: /attachments\/(?:商业保险|体检|看病|相亲|简历|resume)(?:\/|\b)/i,
  },
  {
    reason: "personal-compensation-record",
    pattern: /(?:offer|薪资|薪酬)[^\n]{0,100}(?:\b\d{2,3}K\b|公积金|试用期|年终)/i,
  },
]);

export function autoImportPrivacyReason(sourcePath) {
  const matched = AUTO_IMPORT_DENIED_SOURCE_ROOTS.find((root) => isAtOrBelow(sourcePath, root));
  return matched ? `auto-import-denied:${matched}` : undefined;
}

export function neverPublishSourceReason(sourcePath) {
  const normalized = normalizeSourcePath(sourcePath);
  if (NEVER_PUBLISH_SOURCE_PATHS.has(normalized)) return "never-publish-exact";
  const matchedPrefix = NEVER_PUBLISH_SOURCE_PREFIXES.find((prefix) => isAtOrBelow(normalized, prefix));
  return matchedPrefix ? `never-publish-prefix:${matchedPrefix}` : undefined;
}

export function reviewRequiredSourceReason(sourcePath) {
  const normalized = normalizeSourcePath(sourcePath);
  if (!REVIEW_REQUIRED_SOURCE_PATHS.has(normalized)) return undefined;
  if (PRIVACY_REVIEWED_SOURCE_PATHS.has(normalized)) return undefined;
  return "privacy-review-required";
}

export function semanticPrivacyReason(markdown) {
  for (const { reason, pattern } of SEMANTIC_PRIVACY_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(markdown)) return reason;
  }
  return undefined;
}

export function normalizePrivacySourcePath(sourcePath) {
  return normalizeSourcePath(sourcePath);
}
