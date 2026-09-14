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

const sitemap = await readFile(path.join(distRoot, "sitemap-0.xml"), "utf8");
for (const forbidden of ["/en/search/", "/english/", "/en/notes/"]) {
  invariant(!sitemap.includes(`${siteOrigin}${forbidden}`), `Noindex route leaked into sitemap: ${forbidden}`);
}

const englishNotes = await readFile(routeFile("/en/notes/"), "utf8");
invariant(
  englishNotes.includes(`<link rel="canonical" href="${siteOrigin}/en/notes/">`),
  "English notes shell must self-canonicalize",
);
invariant(!englishNotes.includes("hreflang="), "English notes shell must not advertise hreflang equivalents");
invariant(
  englishNotes.includes('data-pagefind-ignore="all"'),
  "Noindex English notes shell must be excluded from Pagefind",
);
invariant(
  englishNotes.includes('href="/notes/"'),
  "English notes shell must keep a UI language switch back to Chinese",
);

const chineseNotes = await readFile(routeFile("/notes/"), "utf8");
invariant(!chineseNotes.includes("hreflang="), "Chinese notes shell must not advertise a noindex English hreflang target");
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
  englishSeries.includes('<h2 id="ask-blog-title">Ask this blog</h2>'),
  "English Ask Blog title is not localized",
);
invariant(
  englishSeries.includes('placeholder="Type a question. Enter to ask; Shift+Enter for a new line"'),
  "English Ask Blog form is not localized",
);
invariant(
  chineseSeries.includes('<h2 id="ask-blog-title">问博客</h2>'),
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
