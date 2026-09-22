import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveArticleAssetUrl } from "./distribute.mjs";
import {
  defaultPlatformPublishingConfig,
  nativeCanonicalUrl,
  renderPublishingFooter,
} from "./publishing-config.mjs";
import { compilePublishingMarkdown } from "../tools/blogctl/compiler/node/compiler.mjs";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const MEDIUM_MAX_TAGS = 5;

const PARAGRAPH = 1;
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

const ADMONITION_LABELS = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
};

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
  const lines = String(markdown).replaceAll("\r\n", "\n").split("\n");
  const tocHeading = /^#{1,3}\s+(?:table\s+of\s+contents|contents|目录)\s*$/iu;
  const output = [];

  for (let index = 0; index < lines.length;) {
    if (!tocHeading.test(lines[index].trim())) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    index += 1;
    while (index < lines.length && !lines[index].trim()) index += 1;
    while (index < lines.length) {
      const value = lines[index].trim();
      if (!value) {
        index += 1;
        continue;
      }
      if (/^---+$/u.test(value)) {
        index += 1;
        break;
      }
      if (/^#{1,6}\s+/u.test(value)) break;
      if (/^(?:[-*+]\s+|\d+[.)]\s+)/u.test(value)) {
        index += 1;
        continue;
      }
      break;
    }
  }

  return output.join("\n").replace(/^\s+|\s+$/gu, "");
}

function splitTableRow(line) {
  let text = String(line).trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);

  const cells = [];
  let current = "";
  let escaped = false;
  let codeTicks = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }
    if (char === "`") {
      let run = 1;
      while (text[index + run] === "`") run += 1;
      const token = "`".repeat(run);
      current += token;
      index += run - 1;
      codeTicks = codeTicks === run ? 0 : (codeTicks === 0 ? run : codeTicks);
      continue;
    }
    if (char === "|" && codeTicks === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
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
    if (/^\s*\x60\x60\x60/u.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (!inFence && line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        const cells = splitTableRow(lines[index]);
        const rowTitle = cells[0] || headers[0] || "Row";
        if (cells.length === 2) {
          out.push(`**${rowTitle}** — ${cells[1] || ""}`);
          out.push("");
        } else {
          out.push(`**${rowTitle}**`);
          const details = cells.slice(1).map((cell, cellIndex) => {
            const header = headers[cellIndex + 1] || `Column ${cellIndex + 2}`;
            return `**${header}:** ${cell}`;
          });
          if (details.length) out.push(details.join(" · "));
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
    || /^\x60\x60\x60/u.test(value)
    || /^#{1,6}\s+/u.test(value)
    || /^>/u.test(value)
    || /^[-*+]\s+/u.test(value)
    || /^\d+[.)]\s+/u.test(value)
    || /^!\[[^\]]*\]\(/u.test(value)
    || /^---+$/u.test(value);
}

function listDepth(line, markerPattern) {
  const match = String(line).match(markerPattern);
  if (!match) return 0;
  const indent = match[1].replaceAll("\t", "    ").length;
  return Math.max(0, Math.floor(indent / 2));
}

function decorateListInline(inline, depth) {
  if (depth <= 0) return inline;
  const prefix = "↳ ".repeat(depth);
  return {
    text: prefix + inline.text,
    html: escapeHtml(prefix) + inline.html,
    markups: shiftMarkups(inline.markups, prefix.length),
  };
}

function normalizeTaskListText(value) {
  return String(value)
    .replace(/^\[\s\]\s+/u, "☐ ")
    .replace(/^\[[xX]\]\s+/u, "☑ ");
}

function normalizeAdmonition(values) {
  if (!values.length) return values;
  const marker = values[0].trim().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/iu);
  if (!marker) return values;
  const label = ADMONITION_LABELS[marker[1].toUpperCase()] || marker[1];
  const first = marker[2] ? `**${label}.** ${marker[2]}` : `**${label}.**`;
  return [first, ...values.slice(1)];
}

function standaloneImage(line) {
  const match = String(line).trim().match(/^!\[([^\]]*)\]\((\S+)(?:\s+["']([^"']*)["'])?\)$/u);
  if (!match) return null;
  const alt = match[1] || "";
  const url = absoluteHref(match[2]);
  const label = alt ? "[Image: " + alt + "]" : "[Image]";
  return {
    kind: "image",
    paragraphType: PARAGRAPH,
    text: label,
    markups: [{ type: MARKUP_LINK, start: 0, end: label.length, href: url, anchorType: 0 }],
    html: '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt) + '">',
    url,
    alt,
  };
}

export function parseMediumBlocks(markdown) {
  const warnings = [];
  const normalized = flattenMarkdownTables(stripMediumToc(markdown));
  const lines = normalized.split("\n");
  const blocks = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^---+$/u.test(trimmed)) {
      blocks.push({
        kind: "separator",
        paragraphType: PARAGRAPH,
        text: "• • •",
        markups: [],
        html: "<hr>",
      });
      index += 1;
      continue;
    }

    const image = standaloneImage(trimmed);
    if (image) {
      blocks.push(image);
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
      // Medium already receives the article title as a dedicated title block.
      // Body H1/H2 therefore share the section-heading style to avoid a second
      // title-sized heading inside the story.
      const paragraphType = level <= 2 ? H2 : H3;
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
      const inline = parseInline(normalizeAdmonition(values).join("\n"), warnings);
      blocks.push({ kind: "blockquote", paragraphType: BLOCKQUOTE, ...inline });
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.*)$/u);
    if (unordered) {
      const depth = listDepth(line, /^(\s*)[-*+]\s+/u);
      const inline = decorateListInline(parseInline(normalizeTaskListText(unordered[1]), warnings), depth);
      blocks.push({ kind: "uli", paragraphType: ULI, depth, ...inline });
      index += 1;
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/u);
    if (ordered) {
      const depth = listDepth(line, /^(\s*)\d+[.)]\s+/u);
      const inline = decorateListInline(parseInline(ordered[1], warnings), depth);
      blocks.push({ kind: "oli", paragraphType: OLI, depth, ...inline });
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

function publishingLanguage(publishingConfig) {
  return publishingConfig?.language === "zh-CN" ? "zh-CN" : "en";
}

function mediumCanonicalUrl(slug, publishingConfig) {
  const language = publishingLanguage(publishingConfig);
  const prefix = language === "en" ? "/en/articles/" : "/articles/";
  const encodedSlug = String(slug).split("/").map(encodeURIComponent).join("/");
  return new URL(`${prefix}${encodedSlug}/`, SITE_ORIGIN).toString();
}

function footerData(article, canonicalUrl, publishingConfig) {
  const language = publishingLanguage(publishingConfig);
  const markdown = renderPublishingFooter(publishingConfig, {
    canonicalUrl,
    title: article.title,
    site: language === "en" ? "ThinkerQAQ's personal blog" : "ThinkerQAQ 的个人博客",
  }).replace(/^>\s?/u, "").trim();
  if (!markdown) return null;
  return parseInline(markdown, []);
}

export function buildMediumDraft(article, {
  slug,
  publishingConfig = defaultPlatformPublishingConfig("medium"),
}) {
  const canonicalUrl = mediumCanonicalUrl(slug, publishingConfig);
  const compiled = compilePublishingMarkdown(article.body, {
    platform: "medium",
    siteOrigin: SITE_ORIGIN,
  });
  const { blocks, warnings } = parseMediumBlocks(compiled.markdown);
  const deltas = blocks.map((block, index) => ({
    type: 1,
    index,
    paragraph: {
      type: block.paragraphType,
      text: block.text,
      markups: block.markups,
    },
  }));
  const footer = footerData(article, canonicalUrl, publishingConfig);
  if (footer) {
    deltas.push({
      type: 1,
      index: deltas.length,
      paragraph: { type: BLOCKQUOTE, text: footer.text, markups: footer.markups },
    });
  }
  const coverUrl = resolveArticleAssetUrl(article.coverImage);
  return {
    title: article.title,
    canonicalUrl: nativeCanonicalUrl(canonicalUrl, publishingConfig),
    tags: article.tags.slice(0, MEDIUM_MAX_TAGS),
    coverImage: coverUrl ? { url: coverUrl, alt: article.coverImageAlt || "" } : null,
    deltas,
    warnings,
    publishingAssets: compiled.assets,
    requiresHtmlFallback: blocks.some((block) => block.kind === "image"),
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

    if (block.kind === "separator") {
      out.push("<hr>");
    } else if (block.kind === "image") {
      const caption = block.alt ? '<figcaption>' + escapeHtml(block.alt) + '</figcaption>' : "";
      out.push('<figure class="body-image"><img src="' + escapeHtml(block.url) + '" alt="' + escapeHtml(block.alt) + '">' + caption + '</figure>');
    } else if (block.kind === "pre") {
      const language = block.language ? ' class="language-' + escapeHtml(block.language) + '"' : "";
      out.push(`<pre><code${language}>${escapeHtml(block.text)}</code></pre>`);
    } else if (block.kind === "blockquote") {
      out.push(`<blockquote><p>${block.html.replaceAll("\n", "<br>")}</p></blockquote>`);
    } else if (block.kind === "heading") {
      const level = block.level <= 2 ? 2 : 3;
      out.push(`<h${level}>${block.html}</h${level}>`);
    } else {
      out.push(`<p>${block.html}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

export function buildMediumCopyHtml(article, {
  slug,
  publishingConfig = defaultPlatformPublishingConfig("medium"),
}) {
  const canonicalUrl = mediumCanonicalUrl(slug, publishingConfig);
  const compiled = compilePublishingMarkdown(article.body, {
    platform: "medium",
    siteOrigin: SITE_ORIGIN,
  });
  const { blocks } = parseMediumBlocks(compiled.markdown);
  const footer = footerData(article, canonicalUrl, publishingConfig);
  const body = renderBlocks(blocks);
  const coverUrl = resolveArticleAssetUrl(article.coverImage);
  const coverHtml = coverUrl
    ? `<figure class="cover"><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(article.coverImageAlt || "")}"></figure>\n`
    : "";
  const footerHtml = footer ? `\n<hr>\n<blockquote><p>${footer.html}</p></blockquote>` : "";
  return `<!doctype html>
<html lang="${publishingLanguage(publishingConfig)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(article.title)} — Medium Copy</title>
<style>
body{font-family:Georgia,"Times New Roman",serif;max-width:760px;margin:40px auto;padding:0 24px 80px;line-height:1.65;color:#242424}
#toolbar{position:sticky;top:0;background:#fff;padding:12px 0;border-bottom:1px solid #e5e5e5;margin-bottom:32px;z-index:10}
button{font:inherit;padding:9px 14px;cursor:pointer}.cover{margin:0 0 32px}.cover img{display:block;width:100%;height:auto}h1{font-size:2.35rem;line-height:1.15}h2{font-size:1.7rem;margin-top:2.1em}h3{font-size:1.3rem;margin-top:1.7em}
code{font-family:Consolas,"SFMono-Regular",Menlo,monospace}p code,li code{background:#f2f2f2;padding:.08em .28em;border-radius:3px}
pre{font-family:Consolas,"SFMono-Regular",Menlo,monospace;white-space:pre;overflow-x:auto;background:#f7f7f7;padding:16px;border-radius:4px;line-height:1.5}pre code{background:transparent;padding:0}
blockquote{border-left:3px solid #242424;margin-left:0;padding-left:18px}.body-image{margin:2em 0}.body-image img{display:block;max-width:100%;height:auto;margin:0 auto}.body-image figcaption{text-align:center;color:#757575;font-size:.9rem;margin-top:.6em}ul,ol{padding-left:1.4em}li{margin:.35em 0}hr{border:0;border-top:1px solid #ddd;margin:2em 0}
</style>
</head>
<body>
<div id="toolbar"><button id="copyBtn">Copy for Medium</button><span id="status" style="margin-left:10px;color:#666"></span></div>
<article id="article">
<h1>${escapeHtml(article.title)}</h1>
${coverHtml}${body}${footerHtml}
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

export async function writeMediumCopyHtml(article, {
  slug,
  outputRoot = ".distribution/medium",
  publishingConfig = defaultPlatformPublishingConfig("medium"),
} = {}) {
  const outputFile = path.resolve(outputRoot, `${slug}.html`);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, buildMediumCopyHtml(article, { slug, publishingConfig }), "utf8");
  return outputFile;
}
