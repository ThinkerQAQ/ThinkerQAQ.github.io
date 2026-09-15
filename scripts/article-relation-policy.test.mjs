import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ARTICLE_DIR = path.resolve("src/content/articles");
const NOTE_DIR = path.resolve("src/content/notes");
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);

async function walkMarkdownFiles(root) {
  const files = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile() && MARKDOWN_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolute);
      }
    }
  }

  await walk(root);
  return files.sort();
}

function extractFrontmatter(content, file) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(match, `${file} must start with YAML frontmatter`);
  return match[1];
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function scalarField(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  return match ? unquote(match[1]) : undefined;
}

export function parseRelatedNotes(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const index = lines.findIndex((line) => /^relatedNotes:\s*/.test(line));
  if (index === -1) return undefined;

  const inline = lines[index].replace(/^relatedNotes:\s*/, "").trim();
  if (inline === "[]") return [];
  if (inline.startsWith("[") && inline.endsWith("]")) {
    const body = inline.slice(1, -1).trim();
    if (!body) return [];
    return body.split(",").map((item) => unquote(item));
  }
  if (inline) {
    throw new Error(`Unsupported relatedNotes syntax: ${lines[index]}`);
  }

  const notes = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[^\s][^:]*:\s*/.test(line)) break;
    const item = line.match(/^\s*-\s+(.+?)\s*$/);
    if (item) notes.push(unquote(item[1]));
  }
  return notes;
}

function markdownId(file, root) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  return relative.replace(/\.(?:md|mdx)$/i, "");
}

test("relatedNotes parser supports explicit empty and block lists", () => {
  assert.deepEqual(parseRelatedNotes("title: Example\nrelatedNotes: []\nstatus: published"), []);
  assert.deepEqual(
    parseRelatedNotes(
      "title: Example\nrelatedNotes:\n  - go/atomic\n  - java/JUC/4.CAS/4.CAS\nstatus: published",
    ),
    ["go/atomic", "java/JUC/4.CAS/4.CAS"],
  );
});

test("all Articles satisfy the Article ↔ Note relation policy", async () => {
  const [articleFiles, noteFiles] = await Promise.all([
    walkMarkdownFiles(ARTICLE_DIR),
    walkMarkdownFiles(NOTE_DIR),
  ]);
  const noteIds = new Set(noteFiles.map((file) => markdownId(file, NOTE_DIR)));
  const violations = [];

  for (const file of articleFiles) {
    const content = await readFile(file, "utf8");
    const frontmatter = extractFrontmatter(content, file);
    const articleId = markdownId(file, ARTICLE_DIR);
    const translationOf = scalarField(frontmatter, "translationOf");
    let relatedNotes;

    try {
      relatedNotes = parseRelatedNotes(frontmatter);
    } catch (error) {
      violations.push(`${articleId}: ${error.message}`);
      continue;
    }

    if (translationOf) {
      if (relatedNotes !== undefined) {
        violations.push(
          `${articleId}: translated Articles inherit relations from ${translationOf} and must not declare relatedNotes`,
        );
      }
      continue;
    }

    if (relatedNotes === undefined) {
      violations.push(
        `${articleId}: root Articles must explicitly declare relatedNotes: [...] or relatedNotes: [] after relation review`,
      );
      continue;
    }

    const seen = new Set();
    for (const noteId of relatedNotes) {
      if (seen.has(noteId)) {
        violations.push(`${articleId}: duplicate related Note ${noteId}`);
      }
      seen.add(noteId);

      if (!noteIds.has(noteId)) {
        violations.push(`${articleId}: related Note does not exist: ${noteId}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Article relation policy violations:\n${violations.map((item) => `- ${item}`).join("\n")}`,
  );
});
