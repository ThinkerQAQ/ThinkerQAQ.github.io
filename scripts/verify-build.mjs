import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEVER_PUBLISH, PROMOTED_ARTICLES } from "./content-policy.mjs";
import { MANIFEST as DIAGRAM_MANIFEST, validateSvg } from "./plantuml/core.mjs";
import {
  MANIFEST as DRAWIO_MANIFEST,
  diagramUrl as drawIoUrl,
  sha256,
  validateSvg as validateDrawIoSvg,
} from "./drawio/core.mjs";

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
  const homeStructuredData = [...home.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(([, value]) => JSON.parse(value));
  const websiteSchema = homeStructuredData.find((entry) => entry["@type"] === "WebSite");
  invariant(websiteSchema, "Home page is missing WebSite structured data");
  invariant(websiteSchema.name === "ThinkerQAQ", "WebSite structured data has the wrong site name");
  invariant(
    websiteSchema.url === "https://thinkerqaq.github.io/",
    "WebSite structured data has the wrong canonical home URL",
  );
  invariant(
    websiteSchema.alternateName?.includes("thinkerqaq.github.io"),
    "WebSite structured data is missing the domain fallback name",
  );
  const homeArticleLists = [...home.matchAll(/<ol class="content-list">([\s\S]*?)<\/ol>/g)];
  for (const [, articleList] of homeArticleLists) {
    const timestamps = [...articleList.matchAll(/<time datetime="([^"]+)">/g)]
      .map(([, value]) => Date.parse(value));
    invariant(
      timestamps.every((timestamp, index) =>
        Number.isFinite(timestamp) && (index === 0 || timestamps[index - 1] >= timestamp)),
      `Home articles are not in reverse chronological order: ${timestamps.join(", ")}`,
    );
  }
  const htmlSources = await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")));
  const articlePages = htmlFiles
    .map((file, index) => ({ file, html: htmlSources[index] }))
    .filter(({ file, html }) =>
      path.relative(distRoot, file).startsWith(`articles${path.sep}`) &&
      html.includes('<meta property="og:type" content="article">'));
  log("info", "verify-build", "article-pages-detected", { count: articlePages.length });
  for (const { html: articlePage } of articlePages) {
    invariant(articlePage.includes('src="https://utteranc.es/client.js"'), "Published article is missing utterances comments");
    invariant(articlePage.includes('repo="ThinkerQAQ/ThinkerQAQ.github.io"'), "Utterances repository mismatch");
    invariant(articlePage.includes('issue-term="pathname"'), "Utterances must map comments by pathname");
    invariant(articlePage.includes('label="blog-comment"'), "Utterances comment label mismatch");
  }
  const hasSearchContent = htmlSources.some((html) => html.includes("data-pagefind-body"));
  invariant((await exists(path.join(distRoot, "pagefind", "pagefind.js"))) === hasSearchContent, "Search index must match published content (and must be absent on an empty site)");
  if (hasSearchContent) {
    const pagefindRoot = path.join(distRoot, "pagefind");
    const pagefindEntry = JSON.parse(await readFile(path.join(pagefindRoot, "pagefind-entry.json"), "utf8"));
    const wasmIds = new Set(Object.values(pagefindEntry.languages ?? {}).map((language) => language.wasm));
    invariant(wasmIds.size > 0 && !wasmIds.has(null), "Pagefind entry is missing a cache-busted WASM id");
    for (const wasmId of wasmIds) {
      const wasmFile = path.join(pagefindRoot, `wasm.${wasmId}.pagefind`);
      invariant(await exists(wasmFile), `Pagefind WASM bundle is missing: ${path.basename(wasmFile)}`);
      invariant((await stat(wasmFile)).size > 0, `Pagefind WASM bundle is empty: ${path.basename(wasmFile)}`);
    }
    invariant(
      (await stat(path.join(pagefindRoot, "pagefind-worker.js"))).size > 0,
      "Pagefind worker bundle is empty",
    );
  }
  invariant(await exists(path.join(distRoot, "robots.txt")), "robots.txt is missing");
  invariant(await exists(path.join(distRoot, "rss.xml")), "RSS feed is missing");
  const feed = await readFile(path.join(distRoot, "rss.xml"), "utf8");
  for (const route of ["/articles/", "/projects/", "/series/", "/notes/", "/about/", "/search/", "/english/"]) {
    invariant(await exists(routeFile(route)), `Navigation route missing: ${route}`);
  }
  const collectionIntros = new Map([
    ["/articles/", ["文章", "正式发布并持续维护的内容，按最近更新时间倒序排列。"]],
    ["/projects/", ["项目", "记录正在探索、开发或维护的事情，以及最终留下的成果。"]],
    ["/series/", ["系列", "把主题相关的文章和笔记组织在一起，提供更连贯的阅读路径。"]],
    ["/notes/", ["笔记", "保留学习记录、资料整理、实验过程，以及暂时还不需要写成文章的想法。"]],
    ["/about/", ["关于本站", "这里是 ThinkerQAQ 的个人网站，用来记录思考、学习过程和做过的事情。"]],
  ]);
  for (const [route, [title, description]] of collectionIntros) {
    const html = await readFile(routeFile(route), "utf8");
    invariant(html.includes('class="page-header collection-header"'), `Collection header missing: ${route}`);
    invariant(
      html.includes(`<h1 class="visually-hidden">${title}</h1>`),
      `Semantic collection title missing or visible: ${route}`,
    );
    invariant(html.includes(`<p>${description}</p>`), `Collection introduction missing: ${route}`);
  }
  invariant(home.includes('class="page-header collection-header"'), "Home article collection header missing");
  const searchPage = await readFile(routeFile("/search/"), "utf8");
  invariant(searchPage.includes('class="visually-hidden">搜索</h1>'), "Search title must be visually hidden");
  invariant(searchPage.includes("data-search-page"), "Search page state container missing");
  invariant(searchPage.includes('class="search-page__content"'), "Centered search content missing");
  invariant(
    searchPage.includes('class="search-page__brand"') && searchPage.includes("<span>ThinkerQAQ</span>"),
    "Search page brand missing",
  );
  invariant(searchPage.includes("search-page--active"), "Search result layout transition missing");
  const concurrencySeriesPage = await readFile(routeFile("/series/concurrency-programming/"), "utf8");
  invariant(
    !concurrencySeriesPage.includes('class="breadcrumb"') && !concurrencySeriesPage.includes(">SERIES</p>"),
    "Series detail page still contains redundant type labels",
  );
  invariant(
    !concurrencySeriesPage.includes("这个系列聚焦单机") && !concurrencySeriesPage.includes("按顺序阅读"),
    "Series detail page still contains duplicate reading guidance",
  );
  invariant(
    concurrencySeriesPage.includes('class="note-header detail-page-header"'),
    "Series detail header spacing override missing",
  );
  const distributedNotesPage = await readFile(routeFile("/notes/category/distributed-systems/"), "utf8");
  invariant(
    distributedNotesPage.includes('class="shell content-shell note-topic-shell"') &&
      distributedNotesPage.includes('class="series-index"') &&
      distributedNotesPage.includes('class="page-header detail-page-header"'),
    "Note category page is missing the persistent topic sidebar structure",
  );
  invariant(
    !distributedNotesPage.includes('class="breadcrumb"') && !distributedNotesPage.includes(">TOPIC</p>"),
    "Note topic detail still contains redundant type labels",
  );
  const distributedOverviewRoute = "/notes/category/distributed-systems/topic/overview/";
  const distributedOverviewPage = await readFile(routeFile(distributedOverviewRoute), "utf8");
  invariant(
    distributedOverviewPage.includes('class="shell content-shell note-topic-shell"') &&
      distributedOverviewPage.includes('aria-current="page"') &&
      distributedOverviewPage.includes("1.基础与专题"),
    "Root note topic overview is missing from the persistent topic sidebar",
  );
  invariant(
    !(await exists(routeFile("/notes/category/distributed-systems/topic/__root/"))),
    "Internal root topic id leaked into a public route",
  );
  invariant(
    concurrencySeriesPage.includes('aria-label="系列文章"') && concurrencySeriesPage.includes("/articles/concurrency-series-00/"),
    "Series article list missing after header simplification",
  );
  invariant(
      concurrencySeriesPage.includes('class="related-content series-reference-notes"') &&
      concurrencySeriesPage.includes('id="reference-notes-heading"') &&
      concurrencySeriesPage.includes('class="category-index"') &&
      concurrencySeriesPage.includes('/notes/category/java/') &&
      concurrencySeriesPage.includes('Java') &&
      concurrencySeriesPage.includes('最近更新') &&
      /查看 Java 的全部 \d+ 篇笔记/.test(concurrencySeriesPage),
    "Series note category reference missing",
  );
  const javaNotesPage = await readFile(routeFile("/notes/category/java/"), "utf8");
  invariant(
    javaNotesPage.includes('/notes/category/java/topic/JUC/') &&
      javaNotesPage.includes('6.JUC'),
    "Java category is missing the JUC subtopic",
  );
  invariant(
    await exists(routeFile("/notes/category/java/topic/JUC/")),
    "Java JUC topic route missing",
  );
  const legacyJavaCategoryPage = await readFile(routeFile("/notes/category/java-juc/"), "utf8");
  invariant(
    legacyJavaCategoryPage.includes('/notes/category/java/topic/JUC/'),
    "Legacy Java/JUC category redirect missing",
  );
  const legacyJavaNotePage = await readFile(
    routeFile("/notes/java-juc/1.JMM模型/先谈硬件/"),
    "utf8",
  );
  invariant(
    legacyJavaNotePage.includes('/notes/java/JUC/1.JMM模型/先谈硬件/'),
    "Legacy Java/JUC note redirect missing",
  );
  invariant(!sitemap.includes("java-juc"), "Legacy Java/JUC redirects leaked into sitemap");
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
  const drawIoManifest = JSON.parse(await readFile(DRAWIO_MANIFEST, "utf8"));
  for (const diagram of drawIoManifest.diagrams) {
    invariant(diagram.url === drawIoUrl(diagram.output), `draw.io URL mismatch: ${diagram.source}`);
    const svgFile = localTargetFile(diagram.url);
    const svg = validateDrawIoSvg(await readFile(svgFile));
    invariant(sha256(svg) === diagram.outputHash, `draw.io SVG hash mismatch: ${diagram.source}`);
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

  const notesByCategory = new Map();
  for (const entry of manifest.entries) {
    const entries = notesByCategory.get(entry.category) ?? [];
    entries.push(entry);
    notesByCategory.set(entry.category, entries);
  }
  let noteCategoryPages = 0;
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
    const expectedRoutes = new Set(entries.map((entry) => entry.route));
    invariant(
      listedRoutes.size === expectedRoutes.size && [...expectedRoutes].every((route) => listedRoutes.has(route)),
      `Note category pagination coverage mismatch: ${category}`,
    );
    const expectedRouteOrder = [...entries]
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.route);
    invariant(
      listedRouteOrder.every((route, index) => route === expectedRouteOrder[index]),
      `Note category order mismatch: ${category}`,
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
    noteCategoryPages += page - 1;
  }
  log("info", "verify-build", "note-category-pages-checked", {
    categories: notesByCategory.size,
    pages: noteCategoryPages,
  });

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
    drawioImages: drawIoManifest.diagrams.length,
    checkedLocalLinks: "all",
    commentEnabledArticles: articlePages.length,
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
