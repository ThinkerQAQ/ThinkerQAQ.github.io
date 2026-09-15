import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const distRoot = path.join(repositoryRoot, "dist");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function routeFile(route) {
  return path.join(distRoot, decodeURI(route).replace(/^\/+/, ""), "index.html");
}

async function page(route) {
  return readFile(routeFile(route), "utf8");
}

function hasIgnoredRelatedSection(html, headingId) {
  return new RegExp(
    `<section\\b(?=[^>]*class="related-content")(?=[^>]*data-pagefind-ignore="all")[^>]*>[\\s\\S]*?id="${headingId}"`,
  ).test(html);
}

const articleRoute = "/articles/concurrency-series-05-atomic-cas/";
const englishArticleRoute = "/en/articles/concurrency-series-05-atomic-cas/";
const casNoteRoute = "/notes/java/JUC/4.CAS/4.CAS/";
const atomicNoteRoute = "/notes/java/JUC/4.CAS/Atomic/Atomic/";
const englishCasNoteRoute = "/en/notes/java/JUC/4.CAS/4.CAS/";

const article = await page(articleRoute);
invariant(
  hasIgnoredRelatedSection(article, "related-notes-heading"),
  "Atomic article is missing a Pagefind-ignored related notes section",
);
for (const route of [casNoteRoute, atomicNoteRoute]) {
  invariant(article.includes(`href="${route}"`), `Atomic article is missing related note: ${route}`);
}

const englishArticle = await page(englishArticleRoute);
invariant(
  hasIgnoredRelatedSection(englishArticle, "related-notes-heading"),
  "English Atomic article did not inherit the related notes section",
);
for (const route of [
  "/en/notes/java/JUC/4.CAS/4.CAS/",
  "/en/notes/java/JUC/4.CAS/Atomic/Atomic/",
]) {
  invariant(
    englishArticle.includes(`href="${route}"`),
    `English Atomic article is missing localized related note: ${route}`,
  );
}

for (const route of [casNoteRoute, atomicNoteRoute]) {
  const note = await page(route);
  invariant(
    hasIgnoredRelatedSection(note, "related-articles-heading"),
    `Related article backlink section missing from ${route}`,
  );
  invariant(
    note.includes(`href="${articleRoute}"`),
    `Chinese article backlink missing from ${route}`,
  );
}

const englishCasNote = await page(englishCasNoteRoute);
invariant(
  hasIgnoredRelatedSection(englishCasNote, "related-articles-heading"),
  "English CAS note is missing the related article backlink section",
);
invariant(
  englishCasNote.includes(`href="${englishArticleRoute}"`),
  "English CAS note did not prefer the translated Atomic article",
);

console.log(JSON.stringify({
  operation: "verify-article-note-relations",
  status: "completed",
  articleRoute,
  relatedNoteCount: 2,
}));
