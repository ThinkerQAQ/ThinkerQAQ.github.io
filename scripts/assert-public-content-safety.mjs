import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const SECRET_RULES = [
  {
    id: "private-key",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/gu,
  },
  {
    id: "github-token",
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/gu,
  },
  {
    id: "aws-access-key",
    regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu,
  },
  {
    id: "google-api-key",
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/gu,
  },
  {
    id: "slack-token",
    regex: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/gu,
  },
  {
    id: "stripe-live-secret",
    regex: /\bsk_live_[0-9A-Za-z]{20,}\b/gu,
  },
  {
    id: "authorization-secret",
    regex: /\bAuthorization\s*:\s*(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/-]{20,}={0,2}\b/giu,
  },
];

const PRIVACY_WARNING_RULES = [
  {
    id: "email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
    ignore(match) {
      const value = match.toLowerCase();
      return (
        value.endsWith("@example.com") ||
        value.endsWith("@example.org") ||
        value.endsWith("@example.net") ||
        value.endsWith("@users.noreply.github.com")
      );
    },
  },
  {
    id: "cn-mobile",
    regex: /(?<!\d)1[3-9]\d{9}(?!\d)/gu,
  },
  {
    id: "cn-id-card",
    regex: /(?<!\d)\d{17}[0-9Xx](?!\d)/gu,
  },
  {
    id: "private-ipv4",
    regex: /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/gu,
  },
  {
    id: "internal-hostname",
    regex: /\b[a-z0-9][a-z0-9.-]*\.(?:corp|internal|intranet)\b/giu,
  },
];

function isPlaceholder(value) {
  return /(?:EXAMPLE|REDACTED|YOUR[_-]|<[^>]+>|x{8,}|X{8,}|\*{6,})/u.test(value);
}

function allowedRuleIds(text) {
  const ids = new Set();
  for (const match of text.matchAll(/<!--\s*public-audit:\s*allow\s+([a-z0-9-]+)\s*-->/giu)) {
    ids.add(match[1].toLowerCase());
  }
  return ids;
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function runRules(text, file, rules, severity) {
  const allowed = allowedRuleIds(text);
  const findings = [];

  for (const rule of rules) {
    if (allowed.has(rule.id)) continue;
    rule.regex.lastIndex = 0;

    for (const match of text.matchAll(rule.regex)) {
      const value = match[0] || "";
      if (severity === "error" && isPlaceholder(value)) continue;
      if (rule.ignore?.(value)) continue;
      findings.push({
        severity,
        rule: rule.id,
        file,
        line: lineAt(text, match.index || 0),
      });
    }
  }

  return findings;
}

export function auditText(text, { file = "<memory>" } = {}) {
  return [
    ...runRules(text, file, SECRET_RULES, "error"),
    ...runRules(text, file, PRIVACY_WARNING_RULES, "warning"),
  ];
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdown(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(target));
    else if (entry.isFile() && /\.(?:md|mdx)$/iu.test(entry.name)) files.push(target);
  }

  return files;
}

export async function auditDirectory(root) {
  const findings = [];
  for (const file of await walkMarkdown(root)) {
    const text = await readFile(file, "utf8");
    findings.push(...auditText(text, { file: path.relative(process.cwd(), file).split(path.sep).join("/") }));
  }
  return findings;
}

async function main() {
  const args = process.argv.slice(2);
  const requireRoot = args.includes("--require-root");
  const rootArg = args.find(arg => !arg.startsWith("--")) || "src/content";
  const root = path.resolve(rootArg);

  if (!(await exists(root))) {
    if (requireRoot) {
      console.error(`Public content audit root does not exist: ${root}`);
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({
      operation: "assert-public-content-safety",
      status: "skipped",
      reason: "content root missing",
      root,
    }));
    return;
  }

  const findings = await auditDirectory(root);
  const errors = findings.filter(item => item.severity === "error");
  const warnings = findings.filter(item => item.severity === "warning");

  for (const item of findings) {
    const prefix = item.severity === "error" ? "::error" : "::warning";
    console.log(`${prefix} file=${item.file},line=${item.line}::Public content audit: ${item.rule}`);
  }

  console.log(JSON.stringify({
    operation: "assert-public-content-safety",
    status: errors.length ? "failed" : "passed",
    root,
    errors: errors.length,
    warnings: warnings.length,
  }));

  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
