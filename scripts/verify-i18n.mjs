import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const distRoot = path.join(repositoryRoot, "dist");
const siteOrigin = "https://thinkerqaq.github.io";

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

function routeFile(route) {
  return path.join(distRoot, decodeURI(route).replace(/^\/+/, ""), "index.html");
}

function seoHreflangLinks(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  return [...head.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\brel=["']alternate["']/i.test(tag) && /\bhreflang=/i.test(tag));
}

function documentTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
    ?.replaceAll("&amp;", "&")
    .trim();
}

function hasAskBlogTitle(html, title) {
  const match = html.match(/<h2\b[^>]*\bid=["']ask-blog-title["'][^>]*>([\s\S]*?)<\/h2>/i);
  return match?.[1]?.trim() === title;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const pagefindEntryPath = path.join(distRoot, "pagefind", "pagefind-entry.json");
invariant(await exists(pagefindEntryPath), "Pagefind entry is missing");
const pagefindEntry = JSON.parse(await readFile(pagefindEntryPath, "utf8"));
const indexedLanguages = Object.keys(pagefindEntry.languages ?? {}).map((language) => language.toLowerCase());
invariant(indexedLanguages.some((language) => language === "en" || language.startsWith("en-")), "Pagefind English index is missing");
invariant(indexedLanguages.some((language) => language === "zh" || language.startsWith("zh-")), "Pagefind Chinese index is missing");
invariant(indexedLanguages.length >= 2, `Expected multilingual Pagefind indexes, got: ${indexedLanguages.join(", ")}`);

const robots = await readFile(path.join(distRoot, "robots.txt"), "utf8");
invariant(/User-agent:\s*\*/i.test(robots), "robots.txt must allow general crawler rules");
invariant(/Allow:\s*\//i.test(robots), "robots.txt must allow crawling the site");
invariant(
  robots.includes(`Sitemap: ${siteOrigin}/sitemap-index.xml`),
  "robots.txt must advertise sitemap-index.xml",
);

const chineseHome = await readFile(routeFile("/"), "utf8");
const englishHome = await readFile(routeFile("/en/"), "utf8");
invariant(
  documentTitle(chineseHome) === "ThinkerQAQ | 后端工程、并发编程与分布式系统",
  `Chinese homepage SEO title regressed: ${documentTitle(chineseHome)}`,
);
invariant(
  documentTitle(englishHome) === "ThinkerQAQ | Backend Engineering, Concurrency & Distributed Systems",
  `English homepage SEO title is not localized: ${documentTitle(englishHome)}`,
);

const sitemap = await readFile(path.join(distRoot, "sitemap-0.xml"), "utf8");
for (const forbidden of ["/en/search/", "/english/", "/en/notes/"]) {
  invariant(!sitemap.includes(`${siteOrigin}${forbidden}`), `Noindex route leaked into sitemap: ${forbidden}`);
}

const englishNotes = await readFile(routeFile("/en/notes/"), "utf8");
invariant(
  englishNotes.includes(`<link rel="canonical" href="${siteOrigin}/en/notes/">`),
  "English notes shell must self-canonicalize",
);
const englishNotesSeoAlternates = seoHreflangLinks(englishNotes);
invariant(
  englishNotesSeoAlternates.length === 0,
  `English notes shell must not advertise SEO hreflang equivalents: ${englishNotesSeoAlternates.join(" | ")}`,
);
invariant(
  englishNotes.includes('data-pagefind-ignore="all"'),
  "Noindex English notes shell must be excluded from Pagefind",
);
invariant(
  englishNotes.includes('href="/notes/"'),
  "English notes shell must keep a UI language switch back to Chinese",
);
for (const [sourceLabel, englishLabel] of [
  ["分布式系统", "Distributed Systems"],
  ["计算机网络", "Computer Networks"],
  ["系统设计", "System Design"],
]) {
  invariant(
    englishNotes.includes(englishLabel),
    `English Notes taxonomy is missing localized category label: ${englishLabel}`,
  );
  invariant(
    !englishNotes.includes(`>${sourceLabel}<`),
    `Chinese category label leaked into English Notes shell: ${sourceLabel}`,
  );
}

const englishNetworkNotes = await readFile(routeFile("/en/notes/category/computer-network/"), "utf8");
invariant(
  englishNetworkNotes.includes("Computer Networks"),
  "English computer-network category label is not localized",
);
invariant(
  englishNetworkNotes.includes("Transport Layer"),
  "English computer-network topic label is not localized",
);
invariant(
  !englishNetworkNotes.includes(">传输层<") && !englishNetworkNotes.includes(">1.传输层<"),
  "Chinese computer-network topic taxonomy label leaked into the English category page",
);

const chineseNotes = await readFile(routeFile("/notes/"), "utf8");
const chineseNotesSeoAlternates = seoHreflangLinks(chineseNotes);
invariant(
  chineseNotesSeoAlternates.length === 0,
  `Chinese notes shell must not advertise a noindex English SEO hreflang target: ${chineseNotesSeoAlternates.join(" | ")}`,
);
invariant(
  chineseNotes.includes('href="/en/notes/"'),
  "Chinese notes shell must keep a UI language switch to English",
);

const englishSeriesRoute = "/en/series/concurrency-programming/";
const chineseSeriesRoute = "/series/concurrency-programming/";
invariant(await exists(routeFile(englishSeriesRoute)), "Translated English series route is missing");
const englishSeries = await readFile(routeFile(englishSeriesRoute), "utf8");
const chineseSeries = await readFile(routeFile(chineseSeriesRoute), "utf8");
for (const [page, route, locale] of [
  [englishSeries, englishSeriesRoute, "en"],
  [englishSeries, chineseSeriesRoute, "zh-CN"],
  [chineseSeries, englishSeriesRoute, "en"],
  [chineseSeries, chineseSeriesRoute, "zh-CN"],
]) {
  invariant(
    page.includes(`hreflang="${locale}" href="${siteOrigin}${route}"`),
    `Series hreflang missing: ${locale} -> ${route}`,
  );
}
invariant(
  englishSeries.includes(`hreflang="x-default" href="${siteOrigin}${chineseSeriesRoute}"`),
  "English series x-default must point to Chinese",
);
invariant(
  hasAskBlogTitle(englishSeries, "Ask this blog"),
  "English Ask Blog title is not localized",
);
invariant(
  englishSeries.includes('placeholder="Type a question. Enter to ask; Shift+Enter for a new line"'),
  "English Ask Blog form is not localized",
);
invariant(
  hasAskBlogTitle(chineseSeries, "问博客"),
  "Chinese Ask Blog title regressed",
);

const tagRoot = path.join(distRoot, "articles", "tags");
if (await exists(tagRoot)) {
  const tagPages = (await walk(tagRoot)).filter((file) => file.endsWith(".html"));
  for (const file of tagPages) {
    const html = await readFile(file, "utf8");
    invariant(!html.includes('href="/en/articles/'), `English article leaked into Chinese tag page: ${path.relative(distRoot, file)}`);
  }
}

console.log(JSON.stringify({
  operation: "verify-i18n",
  status: "completed",
  indexedLanguages,
}));
