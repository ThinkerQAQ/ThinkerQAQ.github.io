import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const MEDIUM_MAX_TAGS = 5;

const PARAGRAPH = 1;
const H1 = 2;
const H2 = 3;
const H3 = 8;
const BLOCKQUOTE = 9;
const PRE = 10;
const ULI = 13;
const OLI = 15;

const MARKUP_BOLD = 1;
const MARKUP_ITALIC = 2;
const MARKUP_LINK = 3;
const MARKUP_CODE = 10;
const MARKUP_STRIKE = 11;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function absoluteHref(href) {
  if (!href || href.startsWith("#")) return href;
  try {
    return new URL(href, SITE_ORIGIN).toString();
  } catch {
    return href;
  }
}

function shiftMarkups(markups, offset) {
  return markups.map((markup) => ({
    ...markup,
    start: markup.start + offset,
    end: markup.end + offset,
  }));
}

function findNextInlineToken(source) {
  const patterns = [
    { kind: "image", regex: /!\[([^\]]*)\]\(([^)]+)\)/u },
    { kind: "link", regex: /\[([^\]]+)\]\(([^)]+)\)/u },
    { kind: "bold", regex: /\*\*([^*]+?)\*\*/u },
    { kind: "strike", regex: /~~([^~]+?)~~/u },
    { kind: "code", regex: /`([^`\n]+)`/u },
    { kind: "italic", regex: /\*([^*\n]+?)\*/u },
  ];
  let winner = null;
  for (const candidate of patterns) {
    const match = source.match(candidate.regex);
    if (!match) continue;
    if (!winner || match.index < winner.match.index) winner = { ...candidate, match };
  }
  return winner;
}

export function parseInline(source, warnings = []) {
  let rest = String(source);
  let text = "";
  let html = "";
  const markups = [];

  while (rest) {
    const token = findNextInlineToken(rest);
    if (!token) {
      text += rest;
      html += escapeHtml(rest);
      break;
    }

    const prefix = rest.slice(0, token.match.index);
    text += prefix;
    html += escapeHtml(prefix);

    const start = text.length;
    const [raw, first, second] = token.match;

    if (token.kind === "code") {
      text += first;
      html += `<code>${escapeHtml(first)}</code>`;
      markups.push({ type: MARKUP_CODE, start, end: text.length });
    } else if (token.kind === "image") {
      const href = absoluteHref(second);
      const label = first ? `[Image: ${first}]` : "[Image]";
      text += label;
      html += `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
      markups.push({ type: MARKUP_LINK, start, end: text.length, href, anchorType: 0 });
      warnings.push(`Image ${second} is represented as a link in Medium draft M0`);
    } else {
      const inner = parseInline(first, warnings);
      text += inner.text;
      markups.push(...shiftMarkups(inner.markups, start));
      const end = text.length;

      if (token.kind === "link") {
        const href = absoluteHref(second);
        html += `<a href="${escapeHtml(href)}">${inner.html}</a>`;
        markups.push({ type: MARKUP_LINK, start, end, href, anchorType: 0 });
      } else if (token.kind === "bold") {
        html += `<strong>${inner.html}</strong>`;
        markups.push({ type: MARKUP_BOLD, start, end });
      } else if (token.kind === "strike") {
        html += `<del>${inner.html}</del>`;
        markups.push({ type: MARKUP_STRIKE, start, end });
      } else {
        html += `<em>${inner.html}</em>`;
        markups.push({ type: MARKUP_ITALIC, start, end });
      }
    }

    rest = rest.slice(token.match.index + raw.length);
  }

  return { text, markups, html };
}

export function stripMediumToc(markdown) {
  const source = String(markdown).replaceAll("\r\n", "\n");
  const match = source.match(/(^|\n)## Table of Contents\s*\n[\s\S]*?\n---\s*(?=\n|$)/u);
  if (!match) return source;
  return `${source.slice(0, match.index)}${match[1] || "\n"}${source.slice(match.index + match[0].length)}`.trim();
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/u, "").replace(/\|$/u, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

export function flattenMarkdownTables(markdown) {
  const lines = String(markdown).split("\n");
  const out = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/u.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (!inFence && line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        const cells = splitTableRow(lines[index]);
        if (cells.length === 2) {
          out.push(`**${cells[0]}**`);
          out.push("");
          out.push(cells[1]);
          out.push("");
        } else {
          const parts = cells.map((cell, cellIndex) => {
            const header = headers[cellIndex] || `Column ${cellIndex + 1}`;
            return `**${header}:** ${cell}`;
          });
          out.push(parts.join("  "));
          out.push("");
        }
        index += 1;
      }
      index -= 1;
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

function isBlockStart(line) {
  const value = line.trim();
  return !value
    || /^```/u.test(value)
    || /^#{1,6}\s+/u.test(value)
    || /^>/u.test(value)
    || /^[-*+]\s+/u.test(value)
    || /^\d+[.)]\s+/u.test(value)
    || /^---+$/u.test(value);
}

export function parseMediumBlocks(markdown) {
  const warnings = [];
  const normalized = flattenMarkdownTables(stripMediumToc(markdown));
  const lines = normalized.split("\n");
  const blocks = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed || /^---+$/u.test(trimmed)) {
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```([^\s`]*)\s*$/u);
    if (fence) {
      const language = fence[1] || "";
      index += 1;
      const code = [];
      while (index < lines.length && !/^\s*```/u.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ kind: "pre", paragraphType: PRE, text: code.join("\n"), language, markups: [] });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/u);
    if (heading) {
      const level = heading[1].length;
      const inline = parseInline(heading[2], warnings);
      const paragraphType = level === 1 ? H1 : level === 2 ? H2 : H3;
      blocks.push({ kind: "heading", level, paragraphType, ...inline });
      index += 1;
      continue;
    }

    if (/^\s*>/u.test(line)) {
      const values = [];
      while (index < lines.length && /^\s*>/u.test(lines[index])) {
        values.push(lines[index].replace(/^\s*>\s?/u, ""));
        index += 1;
      }
      const inline = parseInline(values.join("\n"), warnings);
      blocks.push({ kind: "blockquote", paragraphType: BLOCKQUOTE, ...inline });
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.*)$/u);
    if (unordered) {
      const inline = parseInline(unordered[1], warnings);
      blocks.push({ kind: "uli", paragraphType: ULI, ...inline });
      index += 1;
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/u);
    if (ordered) {
      const inline = parseInline(ordered[1], warnings);
      blocks.push({ kind: "oli", paragraphType: OLI, ...inline });
      index += 1;
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    const inline = parseInline(paragraph.join(" "), warnings);
    blocks.push({ kind: "paragraph", paragraphType: PARAGRAPH, ...inline });
  }

  return { blocks, warnings: [...new Set(warnings)] };
}

function footerData(canonicalUrl) {
  const anchor = "ThinkerQAQ's personal blog";
  const prefix = "This article was first published on ";
  const suffix = " and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version.";
  const text = `${prefix}${anchor}${suffix}`;
  const start = prefix.length;
  return {
    text,
    html: `<em>${escapeHtml(prefix)}<a href="${escapeHtml(canonicalUrl)}">${escapeHtml(anchor)}</a>${escapeHtml(suffix)}</em>`,
    markups: [
      { type: MARKUP_ITALIC, start: 0, end: text.length },
      { type: MARKUP_LINK, start, end: start + anchor.length, href: canonicalUrl, anchorType: 0 },
    ],
  };
}

export function buildMediumDraft(article, { slug }) {
  const canonicalUrl = new URL(`/en/articles/${slug}/`, SITE_ORIGIN).toString();
  const { blocks, warnings } = parseMediumBlocks(article.body);
  const deltas = blocks.map((block, index) => ({
    type: 1,
    index,
    paragraph: {
      type: block.paragraphType,
      text: block.text,
      markups: block.markups,
    },
  }));
  const footer = footerData(canonicalUrl);
  deltas.push({
    type: 1,
    index: deltas.length,
    paragraph: { type: BLOCKQUOTE, text: footer.text, markups: footer.markups },
  });

  return {
    title: article.title,
    canonicalUrl,
    tags: article.tags.slice(0, MEDIUM_MAX_TAGS),
    deltas,
    warnings,
  };
}

function renderBlocks(blocks) {
  const out = [];
  let listKind = null;
  const closeList = () => {
    if (listKind) out.push(listKind === "uli" ? "</ul>" : "</ol>");
    listKind = null;
  };

  for (const block of blocks) {
    if (block.kind === "uli" || block.kind === "oli") {
      if (listKind !== block.kind) {
        closeList();
        out.push(block.kind === "uli" ? "<ul>" : "<ol>");
        listKind = block.kind;
      }
      out.push(`<li>${block.html}</li>`);
      continue;
    }
    closeList();

    if (block.kind === "pre") {
      out.push(`<pre><code>${escapeHtml(block.text)}</code></pre>`);
    } else if (block.kind === "blockquote") {
      out.push(`<blockquote><p>${block.html.replaceAll("\n", "<br>")}</p></blockquote>`);
    } else if (block.kind === "heading") {
      const level = Math.min(Math.max(block.level, 2), 3);
      out.push(`<h${level}>${block.html}</h${level}>`);
    } else {
      out.push(`<p>${block.html}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

export function buildMediumCopyHtml(article, { slug }) {
  const canonicalUrl = new URL(`/en/articles/${slug}/`, SITE_ORIGIN).toString();
  const { blocks } = parseMediumBlocks(article.body);
  const footer = footerData(canonicalUrl);
  const body = renderBlocks(blocks);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(article.title)} — Medium Copy</title>
<style>
body{font-family:Georgia,"Times New Roman",serif;max-width:760px;margin:40px auto;padding:0 24px 80px;line-height:1.65;color:#242424}
#toolbar{position:sticky;top:0;background:#fff;padding:12px 0;border-bottom:1px solid #e5e5e5;margin-bottom:32px;z-index:10}
button{font:inherit;padding:9px 14px;cursor:pointer}h1{font-size:2.35rem;line-height:1.15}h2{font-size:1.7rem;margin-top:2.1em}h3{font-size:1.3rem;margin-top:1.7em}
code{font-family:Consolas,"SFMono-Regular",Menlo,monospace}p code,li code{background:#f2f2f2;padding:.08em .28em;border-radius:3px}
pre{font-family:Consolas,"SFMono-Regular",Menlo,monospace;white-space:pre;overflow-x:auto;background:#f7f7f7;padding:16px;border-radius:4px;line-height:1.5}pre code{background:transparent;padding:0}
blockquote{border-left:3px solid #242424;margin-left:0;padding-left:18px}hr{border:0;border-top:1px solid #ddd;margin:2em 0}
</style>
</head>
<body>
<div id="toolbar"><button id="copyBtn">Copy for Medium</button><span id="status" style="margin-left:10px;color:#666"></span></div>
<article id="article">
<h1>${escapeHtml(article.title)}</h1>
${body}
<hr>
<blockquote><p>${footer.html}</p></blockquote>
</article>
<script>
document.getElementById('copyBtn').addEventListener('click', async () => {
  const article = document.getElementById('article');
  const status = document.getElementById('status');
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([article.innerHTML], {type:'text/html'}),
      'text/plain': new Blob([article.innerText], {type:'text/plain'})
    })]);
    status.textContent = 'Copied. Paste into Medium.';
  } catch (error) {
    const range = document.createRange(); range.selectNodeContents(article);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.execCommand('copy'); selection.removeAllRanges();
    status.textContent = 'Copied with fallback. Paste into Medium.';
  }
});
</script>
</body>
</html>`;
}

export async function writeMediumCopyHtml(article, { slug, outputRoot = ".distribution/medium" } = {}) {
  const outputFile = path.resolve(outputRoot, `${slug}.html`);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, buildMediumCopyHtml(article, { slug }), "utf8");
  return outputFile;
}
