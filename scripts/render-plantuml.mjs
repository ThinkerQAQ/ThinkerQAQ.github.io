import { mkdir, readFile, writeFile, readdir, lstat, unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { parseFrontmatter } from "astro/markdown";
import { ROOT, CACHE, OUTPUT, MANIFEST, VERSION, diagramKey, diagramUrl, visitCode, validateSvg, log } from "./plantuml/core.mjs";
import { ensureJar, renderSvg } from "./plantuml/runtime.mjs";

const parser = unified().use(remarkParse);
const includeDrafts = process.env.INCLUDE_DRAFTS === "true";

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(target);
  }
  return files.sort();
}

export async function collectDiagrams() {
  const diagrams = new Map();
  for (const collection of ["notes", "articles", "projects", "series"]) {
    for (const file of await markdownFiles(path.join(ROOT, "src", "content", collection))) {
      const { content, frontmatter } = parseFrontmatter(await readFile(file, "utf8"), { frontmatter: "empty-with-lines" });
      const published = collection !== "articles" || frontmatter.status === "published" || includeDrafts;
      const id = path.relative(path.join(ROOT, "src", "content", collection), file).replaceAll(path.sep, "/").replace(/\.md$/, "");
      const route = `/${collection}/${id}/`;
      visitCode(parser.parse(content), (node) => {
        const origin = { file: path.relative(ROOT, file).replaceAll(path.sep, "/"), line: node.position.start.line, route, published };
        let key;
        try { key = diagramKey(node.value); } catch (error) { throw new Error(`${origin.file}:${origin.line}: ${error.message}`); }
        const item = diagrams.get(key) ?? { key, source: node.value, origins: [] };
        item.origins.push(origin);
        diagrams.set(key, item);
      });
    }
  }
  return [...diagrams.values()];
}

export async function renderAll() {
  const startedAt = Date.now();
  const diagrams = await collectDiagrams();
  log("plantuml-build", "started", { uniqueDiagrams: diagrams.length, blocks: diagrams.reduce((sum, item) => sum + item.origins.length, 0) });
  await mkdir(CACHE, { recursive: true });
  await mkdir(OUTPUT, { recursive: true });
  if ((await lstat(OUTPUT)).isSymbolicLink()) throw new Error("Refusing symlink diagram output directory");
  const pending = [];
  for (const item of diagrams) {
    try { item.svg = validateSvg(await readFile(path.join(CACHE, `${item.key}.svg`), "utf8")); }
    catch (error) {
      if (error.code && error.code !== "ENOENT") throw error;
      pending.push(item);
    }
  }
  if (pending.length) await ensureJar();
  let next = 0;
  const failures = [];
  await Promise.all(Array.from({ length: Math.min(2, pending.length) }, async () => {
    while (next < pending.length) {
      const item = pending[next++];
      const start = Date.now();
      const context = { requestId: item.key.slice(0, 12), file: item.origins[0].file, line: item.origins[0].line };
      log("plantuml-render", "started", context);
      try {
        item.svg = await renderSvg(item.source);
        await writeFile(path.join(CACHE, `${item.key}.svg`), item.svg, "utf8");
        log("plantuml-render", "completed", { ...context, durationMs: Date.now() - start });
      } catch (error) {
        failures.push(item);
        log("plantuml-render", "failed", { ...context, error: error.message, durationMs: Date.now() - start }, "error");
      }
    }
  }));
  if (failures.length) throw new Error(`${failures.length} PlantUML diagram(s) failed. Original Markdown is unchanged. See file and line above.`);
  // Publish only current, public diagrams; draft caches never enter public/.
  const published = diagrams.filter((item) => item.origins.some((origin) => origin.published));
  const expected = new Set(published.map((item) => `${item.key}.svg`));
  for (const item of published) await writeFile(path.join(OUTPUT, `${item.key}.svg`), item.svg, "utf8");
  for (const entry of await readdir(OUTPUT, { withFileTypes: true })) {
    if (entry.isFile() && /^[a-f0-9]{64}\.svg$/.test(entry.name) && !expected.has(entry.name)) {
      const target = path.resolve(OUTPUT, entry.name);
      if (path.dirname(target) !== path.resolve(OUTPUT)) throw new Error("Unsafe stale diagram target");
      await unlink(target); // Generated cache only; reproducible from Markdown.
    }
  }
  await writeFile(MANIFEST, JSON.stringify({ version: VERSION, diagrams: published.map(({ key, origins }) => ({ key, url: diagramUrl(key), origins: origins.filter((origin) => origin.published) })) }, null, 2) + "\n");
  log("plantuml-build", "completed", { rendered: pending.length, cached: diagrams.length - pending.length, published: published.length, durationMs: Date.now() - startedAt });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  renderAll().catch((error) => { log("plantuml-build", "failed", { error: error.message }, "error"); process.exitCode = 1; });
}
