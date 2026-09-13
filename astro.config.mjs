import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import plantumlMarkdown from "./scripts/plantuml/markdown.mjs";
import textCodeGrid from "./scripts/text-code-grid.mjs";

const manifestPath = fileURLToPath(
  new URL("./src/data/content-manifest.json", import.meta.url),
);

let noindexRoutes = new Set();
const legacyRedirectPrefixes = ["/notes/java-juc/", "/notes/category/java-juc/"];

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
        return !["/search/", "/agent/", "/404/"].includes(route)
          && !noindexRoutes.has(route)
          && !legacyRedirectPrefixes.some((prefix) => route.startsWith(prefix));
      },
    }),
  ],
  markdown: {
    processor: satteri({
      mdastPlugins: [plantumlMarkdown],
      hastPlugins: [textCodeGrid],
    }),
    shikiConfig: {
      theme: "github-dark-default",
      wrap: true,
    },
  },
});
