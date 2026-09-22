import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveBlogContentRoot(env = process.env) {
  const configured = env.BLOG_CONTENT_ROOT?.trim();
  if (!configured) {
    throw new Error("BLOG_CONTENT_ROOT is required. Run this through blogctl sync from the blog-content repository.");
  }
  return path.resolve(configured);
}

export function resolveDistributionOutputRoot(contentRoot, outputRoot) {
  return path.resolve(contentRoot, outputRoot);
}

export function resolveDistributionArticleRoot(contentRoot, language = "zh-CN") {
  const root = path.join(contentRoot, "src", "content", "articles");
  return language === "en" ? path.join(root, "en") : root;
}

function main() {
  console.error("scripts/blogctl-distribute.mjs is a compatibility stub. Use: blogctl sync --article <slug> --platforms <list> --dry-run");
  process.exitCode = 2;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) main();
