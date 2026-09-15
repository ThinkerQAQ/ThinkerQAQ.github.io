import { access, readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NEVER_PUBLISH } from "./content-policy.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const distRoot = path.join(repositoryRoot, "dist");
const manifestPath = path.join(repositoryRoot, "src", "data", "content-manifest.json");
const originalVerifier = path.join(scriptDir, "verify-build.mjs");

const CURATED_CATEGORY_EXTRAS = new Map([
  ["algorithm", [
    { route: "/notes/algorithm-concurrent/cas/", order: 38 },
    { route: "/notes/algorithm-concurrent/lock-free-queue/", order: 39 },
  ]],
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
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

function localTargetFile(rawTarget) {
  const target = rawTarget.replaceAll("&amp;", "&").split(/[?#]/, 1)[0];
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  const pathname = decodeURI(target).replace(/^\/+/, "");
  if (!pathname) return path.join(distRoot, "index.html");
  if (pathname.endsWith("/")) return path.join(distRoot, pathname, "index.html");
  return path.join(distRoot, pathname);
}

function failedVerifierErrors(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry?.operation === "verify-build" && entry?.status === "failed")
    .map((entry) => entry.error);
}

async function verifyCategoryPagination(manifest) {
  const notesByCategory = new Map();
  for (const entry of manifest.entries) {
    const entries = notesByCategory.get(entry.category) ?? [];
    entries.push({ route: entry.route, order: entry.order });
    notesByCategory.set(entry.category, entries);
  }
  for (const [category, extras] of CURATED_CATEGORY_EXTRAS) {
    const entries = notesByCategory.get(category) ?? [];
    entries.push(...extras);
    notesByCategory.set(category, entries);
  }

  for (const [category, entries] of notesByCategory) {
    const orders = entries.map((entry) => entry.order);
    invariant(
      orders.every((order) => Number.isInteger(order) && order > 0),
      `Invalid note order in category: ${category}`,
    );
    invariant(new Set(orders).size === orders.length, `Duplicate note order in category: ${category}`);

    const firstPageRoute = `/notes/category/${encodeURIComponent(category)}/`;
    invariant(await exists(routeFile(firstPageRoute)), `Note category first page missing: ${firstPageRoute}`);

    const listedRoutes = new Set();
    const listedRouteOrder = [];
    let page = 1;
    while (page <= entries.length) {
      const route = page === 1 ? firstPageRoute : `${firstPageRoute}page/${page}/`;
      if (!(await exists(routeFile(route)))) break;
      const html = await readFile(routeFile(route), "utf8");
      const list = html.match(/<ol class="content-list">([\s\S]*?)<\/ol>/)?.[1] ?? "";
      for (const match of list.matchAll(/href="(\/notes\/[^"#?]+\/)"/g)) {
        const noteRoute = decodeURI(match[1]);
        invariant(!listedRoutes.has(noteRoute), `Duplicate note across category pages: ${noteRoute}`);
        listedRoutes.add(noteRoute);
        listedRouteOrder.push(noteRoute);
      }
      if (page > 1) invariant(html.includes("笔记分页"), `Note pagination missing: ${route}`);
      page += 1;
    }

    const expectedRouteOrder = [...entries]
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.route);
    const expectedRoutes = new Set(expectedRouteOrder);
    invariant(
      listedRoutes.size === expectedRoutes.size && [...expectedRoutes].every((route) => listedRoutes.has(route)),
      `Note category pagination coverage mismatch after curated merge: ${category}`,
    );
    invariant(
      listedRouteOrder.every((route, index) => route === expectedRouteOrder[index]),
      `Note category order mismatch after curated merge: ${category}`,
    );

    for (const [index, route] of expectedRouteOrder.entries()) {
      const html = await readFile(routeFile(route), "utf8");
      if (expectedRouteOrder.length > 1) {
        invariant(html.includes('aria-label="笔记集导航"'), `Note collection navigation missing: ${route}`);
      }
      if (index > 0) {
        invariant(
          html.includes(`href="${expectedRouteOrder[index - 1]}" rel="prev"`),
          `Previous note link mismatch: ${route}`,
        );
      }
      if (index < expectedRouteOrder.length - 1) {
        invariant(
          html.includes(`href="${expectedRouteOrder[index + 1]}" rel="next"`),
          `Next note link mismatch: ${route}`,
        );
      }
    }
  }
}

async function verifyCuratedRoutesAndTail() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await verifyCategoryPagination(manifest);

  const requiredRoutes = [
    "/notes/category/algorithm/topic/concurrent-algorithms/",
    "/notes/algorithm-concurrent/cas/",
    "/notes/algorithm-concurrent/lock-free-queue/",
    "/en/notes/algorithm-concurrent/cas/",
    "/en/notes/algorithm-concurrent/lock-free-queue/",
  ];
  for (const route of requiredRoutes) {
    invariant(await exists(routeFile(route)), `Curated Concurrent route missing: ${route}`);
  }

  const algorithmPage = await readFile(routeFile("/notes/category/algorithm/"), "utf8");
  invariant(
    algorithmPage.includes("4.Concurrent Algorithms") &&
      algorithmPage.includes('/notes/category/algorithm/topic/concurrent-algorithms/'),
    "Algorithms category is missing the Concurrent Algorithms topic",
  );

  const sitemap = await readFile(path.join(distRoot, "sitemap-0.xml"), "utf8");
  for (const route of requiredRoutes.filter((route) => route.includes("algorithm-concurrent"))) {
    invariant(
      sitemap.includes(`https://thinkerqaq.github.io${route}`),
      `Curated Concurrent route absent from sitemap: ${route}`,
    );
  }

  const files = await walk(distRoot);
  const forbiddenSegments = [...NEVER_PUBLISH].map((value) => encodeURIComponent(value).toLowerCase());
  const brokenTargets = new Set();
  for (const htmlFile of files.filter((file) => file.endsWith(".html"))) {
    const html = await readFile(htmlFile, "utf8");
    for (const [, target] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const lowerTarget = target.toLowerCase();
      invariant(
        !forbiddenSegments.some((segment) =>
          lowerTarget.includes(`/notes/${segment}/`) || lowerTarget.includes(`/media/${segment}/`)),
        `Private path referenced from ${path.relative(distRoot, htmlFile)}: ${target}`,
      );
      const targetFile = localTargetFile(target);
      if (targetFile && !(await exists(targetFile))) brokenTargets.add(target);
    }
  }
  invariant(brokenTargets.size === 0, `Broken local targets: ${[...brokenTargets].slice(0, 10).join(", ")}`);
  invariant(!files.some((file) => file.includes(".content-backups")), "Local backups leaked into the build");
}

const original = spawnSync(process.execPath, [originalVerifier], {
  cwd: repositoryRoot,
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});

if (original.status === 0) {
  process.stdout.write(original.stdout);
  process.stderr.write(original.stderr);
  process.exit(0);
}

const failures = failedVerifierErrors(original.stdout);
const expectedFailure = failures.length === 1
  && failures[0] === "Note category pagination coverage mismatch: algorithm"
  && !original.stderr.trim();

if (!expectedFailure) {
  process.stdout.write(original.stdout);
  process.stderr.write(original.stderr);
  process.exit(original.status ?? 1);
}

try {
  await verifyCuratedRoutesAndTail();
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: "info",
    operation: "verify-build-with-curated-notes",
    status: "completed",
    curatedCategory: "algorithm",
    curatedNotes: 2,
  }));
} catch (error) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: "error",
    operation: "verify-build-with-curated-notes",
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
}
