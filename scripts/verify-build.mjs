import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEVER_PUBLISH, PROMOTED_ARTICLES } from "./content-policy.mjs";
import { MANIFEST as DIAGRAM_MANIFEST, validateSvg } from "./plantuml/core.mjs";

const startedAt = Date.now();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const distRoot = path.join(repositoryRoot, "dist");
const manifestPath = path.join(repositoryRoot, "src", "data", "content-manifest.json");

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function routeFile(route) {
  const pathname = decodeURI(route).replace(/^\/+/, "");
  return path.join(distRoot, pathname, "index.html");
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function localTargetFile(rawTarget) {
  const target = rawTarget.replaceAll("&amp;", "&").split(/[?#]/, 1)[0];
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  const pathname = decodeURI(target).replace(/^\/+/, "");
  if (!pathname) return path.join(distRoot, "index.html");
  if (pathname.endsWith("/")) return path.join(distRoot, pathname, "index.html");
  return path.join(distRoot, pathname);
}

async function main() {
  log("info", "verify-build", "started", { distRoot });
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = await walk(distRoot);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const sitemap = await readFile(path.join(distRoot, "sitemap-0.xml"), "utf8");
  const home = await readFile(path.join(distRoot, "index.html"), "utf8");

  invariant(htmlFiles.length >= manifest.entries.length, "Fewer HTML pages than imported notes");
  invariant(home.includes("<main id=\"main-content\">"), "Home page has no static main content");
  invariant(!home.includes("viki.js"), "Legacy Viki runtime leaked into the production home page");
  const htmlSources = await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")));
  const hasSearchContent = htmlSources.some((html) => html.includes("data-pagefind-body"));
  invariant((await exists(path.join(distRoot, "pagefind", "pagefind.js"))) === hasSearchContent, "Search index must match published content (and must be absent on an empty site)");
  invariant(await exists(path.join(distRoot, "robots.txt")), "robots.txt is missing");
  invariant(await exists(path.join(distRoot, "rss.xml")), "RSS feed is missing");
  const feed = await readFile(path.join(distRoot, "rss.xml"), "utf8");
  for (const route of ["/articles/", "/projects/", "/series/", "/notes/", "/about/", "/english/"]) {
    invariant(await exists(routeFile(route)), `Navigation route missing: ${route}`);
  }
  for (const article of PROMOTED_ARTICLES) {
    const route = `/articles/${article.slug}/`;
    invariant(await exists(routeFile(route)), `Promoted article missing: ${route}`);
    invariant(feed.includes(route), `Article absent from RSS: ${route}`);
    invariant(sitemap.includes(`https://thinkerqaq.github.io${route}`), `Article absent from sitemap: ${route}`);
  }
  invariant(!feed.includes("https://thinkerqaq.github.io/notes/"), "Raw notes leaked into article RSS");
  const diagramManifest = JSON.parse(await readFile(DIAGRAM_MANIFEST, "utf8"));
  let diagramReferences = 0;
  for (const diagram of diagramManifest.diagrams) {
    const svgFile = localTargetFile(diagram.url);
    validateSvg(await readFile(svgFile, "utf8"));
    for (const origin of diagram.origins) {
      const html = await readFile(routeFile(origin.route), "utf8");
      invariant(html.includes(`src="${diagram.url}"`), `PlantUML image missing: ${origin.file}:${origin.line}`);
      diagramReferences += 1;
    }
  }

  const missingRoutes = [];
  const sitemapErrors = [];
  for (const entry of manifest.entries) {
    const outputFile = routeFile(entry.route);
    if (!(await exists(outputFile))) {
      missingRoutes.push(entry.route);
      continue;
    }
    const html = await readFile(outputFile, "utf8");
    invariant(html.includes("data-pagefind-body"), `Search body missing: ${entry.route}`);
    invariant(html.includes("rel=\"canonical\""), `Canonical URL missing: ${entry.route}`);
    if (entry.canonicalPath) {
      const canonical = new URL(entry.canonicalPath, "https://thinkerqaq.github.io").toString();
      invariant(html.includes(`rel="canonical" href="${canonical}"`), `Promoted canonical mismatch: ${entry.route}`);
      invariant(await exists(routeFile(entry.canonicalPath)), `Canonical target missing: ${entry.canonicalPath}`);
    }
    const absoluteUrl = new URL(entry.route, "https://thinkerqaq.github.io").toString();
    const inSitemap = sitemap.includes(absoluteUrl);
    if (entry.indexable !== inSitemap) sitemapErrors.push(entry.route);
    if (!entry.indexable) {
      invariant(html.includes("name=\"robots\" content=\"noindex,follow\""), `noindex missing: ${entry.route}`);
    }
  }
  invariant(missingRoutes.length === 0, `Missing note routes: ${missingRoutes.slice(0, 5).join(", ")}`);
  invariant(sitemapErrors.length === 0, `Sitemap policy mismatch: ${sitemapErrors.slice(0, 5).join(", ")}`);

  const forbiddenSegments = [...NEVER_PUBLISH].map((value) => encodeURIComponent(value).toLowerCase());
  const brokenTargets = new Set();
  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, "utf8");
    const routeReferences = html.matchAll(/(?:href|src)="([^"]+)"/g);
    for (const [, target] of routeReferences) {
      const lowerTarget = target.toLowerCase();
      invariant(
        !forbiddenSegments.some((segment) => lowerTarget.includes(`/notes/${segment}/`) || lowerTarget.includes(`/media/${segment}/`)),
        `Private path referenced from ${path.relative(distRoot, htmlFile)}: ${target}`,
      );
      const targetFile = localTargetFile(target);
      if (targetFile && !(await exists(targetFile))) brokenTargets.add(target);
    }
  }
  invariant(brokenTargets.size === 0, `Broken local targets: ${[...brokenTargets].slice(0, 10).join(", ")}`);
  invariant(!files.some((file) => file.includes(".content-backups")), "Local backups leaked into the build");

  log("info", "verify-build", "completed", {
    htmlPages: htmlFiles.length,
    importedNotes: manifest.entries.length,
    indexableNotes: manifest.entries.filter((entry) => entry.indexable).length,
    plantumlImages: diagramManifest.diagrams.length,
    plantumlReferences: diagramReferences,
    checkedLocalLinks: "all",
    durationMs: Date.now() - startedAt,
  });
}

main().catch((error) => {
  log("error", "verify-build", "failed", {
    error: error instanceof Error ? error.message : String(error),
    durationMs: Date.now() - startedAt,
  });
  process.exitCode = 1;
});
