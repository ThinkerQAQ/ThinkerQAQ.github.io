import { access, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const root = process.cwd();
const mediaRoot = path.join(root, "public", "media", "articles");

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.isFile() && /^cover-(?:zh|en)\.svg$/i.test(entry.name)) files.push(target);
  }
  return files;
}

if (!(await exists(mediaRoot))) {
  console.log(JSON.stringify({ operation: "render-cover-social", rendered: 0 }));
  process.exit(0);
}

const sources = await walk(mediaRoot);
let rendered = 0;
for (const source of sources) {
  const target = source.replace(/\.svg$/i, ".jpg");
  await sharp(source, { density: 144 })
    .resize(1200, 630, { fit: "cover" })
    .jpeg({ quality: 88, progressive: true, mozjpeg: true })
    .toFile(target);
  rendered += 1;
}

console.log(JSON.stringify({ operation: "render-cover-social", rendered }));
