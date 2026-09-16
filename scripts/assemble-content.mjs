import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = path.resolve(process.argv[2] || process.env.BLOG_CONTENT_ROOT || "fixtures");
const sourceContent = path.join(sourceRoot, "src", "content");
const targetContent = path.join(root, "src", "content");

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(sourceContent))) {
  throw new Error(`Content source does not exist: ${sourceContent}`);
}

await rm(targetContent, { recursive: true, force: true });
await mkdir(path.dirname(targetContent), { recursive: true });
await cp(sourceContent, targetContent, { recursive: true });

const sourceMedia = path.join(sourceRoot, "public", "media");
if (await exists(sourceMedia)) {
  const targetMedia = path.join(root, "public", "media");
  await rm(targetMedia, { recursive: true, force: true });
  await mkdir(path.dirname(targetMedia), { recursive: true });
  await cp(sourceMedia, targetMedia, { recursive: true });
}

console.log(JSON.stringify({
  operation: "assemble-content",
  sourceRoot,
  targetContent,
  mediaCopied: await exists(sourceMedia),
}));
