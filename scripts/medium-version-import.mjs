import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const DEFAULT_OUTPUT_ROOT = "public/medium-import/en";

async function existingFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

async function findImportPages(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const pages = [];
  for (const entry of entries) {
    if (entry.name.startsWith("v-")) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      pages.push(...await findImportPages(absolute, root));
      continue;
    }
    if (entry.isFile() && entry.name === "index.html") {
      pages.push({
        file: absolute,
        directory,
        slug: path.relative(root, directory).split(path.sep).join("/"),
      });
    }
  }
  return pages;
}

export async function computeImportVersion(pageFile, assetsDirectory) {
  const hash = createHash("sha256");
  hash.update(await readFile(pageFile));
  for (const name of await existingFiles(assetsDirectory)) {
    hash.update(name);
    hash.update(await readFile(path.join(assetsDirectory, name)));
  }
  return hash.digest("hex").slice(0, 12);
}

function encodedSlug(slug) {
  return slug.split("/").map(encodeURIComponent).join("/");
}

export function buildVersionedImportUrl(slug, version) {
  return new URL(`/medium-import/en/${encodedSlug(slug)}/v-${version}/`, SITE_ORIGIN).toString();
}

export function versionAssetUrls(html, slug, version) {
  const encoded = encodedSlug(slug);
  const stable = `${SITE_ORIGIN}/medium-import/en/${encoded}/assets/`;
  const versioned = `${SITE_ORIGIN}/medium-import/en/${encoded}/v-${version}/assets/`;
  return html.replaceAll(stable, versioned);
}

export async function generateVersionedMediumImports({ outputRoot } = {}) {
  const root = path.resolve(outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const pages = await findImportPages(root);
  const generated = [];

  for (const page of pages) {
    const assetsDirectory = path.join(page.directory, "assets");
    const version = await computeImportVersion(page.file, assetsDirectory);
    const versionDirectory = path.join(page.directory, `v-${version}`);
    const versionAssets = path.join(versionDirectory, "assets");
    const html = versionAssetUrls(await readFile(page.file, "utf8"), page.slug, version);

    await mkdir(versionDirectory, { recursive: true });
    await writeFile(path.join(versionDirectory, "index.html"), html, "utf8");

    const assetNames = await existingFiles(assetsDirectory);
    if (assetNames.length > 0) {
      await mkdir(versionAssets, { recursive: true });
      for (const name of assetNames) {
        await copyFile(path.join(assetsDirectory, name), path.join(versionAssets, name));
      }
    }

    const latest = {
      slug: page.slug,
      version,
      importUrl: buildVersionedImportUrl(page.slug, version),
    };
    await writeFile(path.join(page.directory, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`, "utf8");
    generated.push(latest);
  }

  return generated;
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDir, "..");
  const generated = await generateVersionedMediumImports({
    outputRoot: path.join(repositoryRoot, DEFAULT_OUTPUT_ROOT),
  });
  for (const item of generated) {
    console.log(JSON.stringify({ operation: "medium-import-version", status: "generated", ...item }));
  }
  console.log(JSON.stringify({ operation: "medium-import-version", status: "completed", total: generated.length }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    console.error(JSON.stringify({
      operation: "medium-import-version",
      status: "failed",
      exception: { name: error.name, message: error.message, stack: error.stack },
    }));
    process.exitCode = 1;
  });
}
