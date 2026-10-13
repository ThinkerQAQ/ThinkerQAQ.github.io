import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = resolve(
  process.env.BLOG_TEMPLATE_ROOT || join(engineRoot, "..", "blog-content-template"),
);
const sourceContent = join(contentRoot, "src", "content");
const templateUrl = "https://github.com/ThinkerQAQ/blog-content-template.git";

function run(program, args, cwd = engineRoot) {
  const result = spawnSync(program, args, { cwd, stdio: "inherit" });
  if (result.error) {
    console.error(`Unable to run ${program}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

if (!existsSync(sourceContent)) {
  if (process.env.BLOG_TEMPLATE_ROOT || existsSync(contentRoot)) {
    console.error(`Template content not found at ${sourceContent}. Set BLOG_TEMPLATE_ROOT to a valid template checkout.`);
    process.exit(1);
  }
  console.log(`Cloning public demo content into ${contentRoot}`);
  run("git", ["clone", "--depth", "1", templateUrl, contentRoot]);
}
console.log(`Assembling demo content from ${contentRoot}`);
run("go", ["run", "./tools/blogctl/cmd", "site", "assemble", "--content-root", contentRoot]);
