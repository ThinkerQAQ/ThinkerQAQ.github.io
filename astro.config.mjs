import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import plantumlMarkdown from "./scripts/plantuml/markdown.mjs";
import readingTimeMarkdown from "./scripts/reading-time.mjs";
import markdownImageLoading from "./scripts/image-loading.mjs";
import textCodeGrid from "./scripts/text-code-grid.mjs";

const manifestPath = fileURLToPath(
  new URL("./src/data/content-manifest.json", import.meta.url),
);
const noteTranslationRoot = fileURLToPath(
  new URL("./src/content/note-translations/", import.meta.url),
);

let noindexRoutes = new Set();
const translatedNoteRoutes = new Set();
const excludedRoutes = new Set([
  "/search/",
  "/en/search/",
  "/agent/",
  "/404/",
  "/english/",
]);
const localizedNotesPrefixes = ["/en/notes/"];
const legacyRedirectPrefixes = ["/notes/java-juc/", "/notes/category/java-juc/"];

function frontmatterValue(markdown, field) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const match = frontmatter.match(new RegExp(`^${field}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, "m"));
  return match?.[1]?.trim();
}

function collectTranslatedNoteRoutes(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectTranslatedNoteRoutes(absolute);
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;

    const markdown = readFileSync(absolute, "utf8");
    const language = frontmatterValue(markdown, "language");
    const translationOf = frontmatterValue(markdown, "translationOf")?.replace(/^\/+|\/+$/g, "");
    if (!language || !translationOf || language === "zh") continue;
    translatedNoteRoutes.add(decodeURI(`/${language}/notes/${translationOf}/`));
  }
}

try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  noindexRoutes = new Set(
    manifest.entries
      .filter((entry) => !entry.indexable)
      .map((entry) => decodeURI(entry.route)),
  );
} catch {
  // The import script creates this manifest before the first production build.
}

try {
  collectTranslatedNoteRoutes(noteTranslationRoot);
} catch {
  // A fresh checkout may not have localized notes yet.
}

export default defineConfig({
  site: "https://thinkerqaq.github.io",
  output: "static",
  server: {
    port: 4321,
  },
  vite: {
    server: {
      strictPort: true,
    },
    preview: {
      strictPort: true,
    },
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const route = decodeURI(new URL(page).pathname);
        const localizedNotesPrefix = localizedNotesPrefixes.find((prefix) => route.startsWith(prefix));
        const defaultLanguageRoute = localizedNotesPrefix ? route.replace(/^\/en(?=\/notes\/)/, "") : route;
        return !excludedRoutes.has(route)
          && !noindexRoutes.has(defaultLanguageRoute)
          && (!localizedNotesPrefix || translatedNoteRoutes.has(route))
          && !legacyRedirectPrefixes.some((prefix) => route.startsWith(prefix));
      },
    }),
  ],
  markdown: {
    processor: satteri({
      mdastPlugins: [plantumlMarkdown, readingTimeMarkdown],
      hastPlugins: [textCodeGrid, markdownImageLoading],
    }),
    shikiConfig: {
      theme: "github-dark-default",
      wrap: true,
    },
  },
});
