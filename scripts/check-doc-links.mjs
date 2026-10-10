// Validate internal Markdown links with the repository's existing remark parser.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";

const roots = ["docs", "tools/blogctl/docs"];
const entrypoints = ["README.md", "README_ZH.md", "AGENTS.md", "tools/blogctl/README.md", "tools/blogctl/AGENTS.md"];
const documents = [...entrypoints];

function addMarkdown(dir) {
  if (!existsSync(dir)) return;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) addMarkdown(full);
    else if (item.isFile() && item.name.endsWith(".md")) documents.push(full);
  }
}

function visit(node, callback) {
  if (node.type === "link" || node.type === "image" || node.type === "definition") callback(node);
  if (Array.isArray(node.children)) for (const child of node.children) visit(child, callback);
}

for (const dir of roots) addMarkdown(dir);
const errors = [];
let links = 0;
for (const doc of documents) {
  const tree = unified().use(remarkParse).parse(readFileSync(doc, "utf8"));
  visit(tree, (node) => {
    const url = node.url || "";
    if (!url || url.startsWith("#") || url.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(url)) return;
    let relative;
    try { relative = decodeURIComponent(url.split(/[?#]/, 1)[0]); }
    catch { errors.push(`${doc}:${node.position?.start.line ?? 1}: malformed link ${url}`); return; }
    if (!relative) return;
    links++;
    const target = path.resolve(path.dirname(doc), relative);
    if (!existsSync(target)) {
      errors.push(`${doc}:${node.position?.start.line ?? 1}: missing ${url}`);
    } else if (!statSync(target).isFile() && !statSync(target).isDirectory()) {
      errors.push(`${doc}:${node.position?.start.line ?? 1}: inaccessible ${url}`);
    }
  });
}
if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`Failed: ${errors.length} broken link(s) in ${documents.length} Markdown files.`);
  process.exitCode = 1;
} else {
  console.log(`OK: ${links} internal links across ${documents.length} Markdown files.`);
}
