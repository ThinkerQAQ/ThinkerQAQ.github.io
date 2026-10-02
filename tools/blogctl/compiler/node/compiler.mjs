export const SITE_ORIGIN = "https://thinkerqaq.github.io";

function normalizeNewlines(value) {
  return String(value ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function fenceStart(line) {
  const match = line.match(/^( {0,3})((?:\x60{3,}|~{3,}))([^\n]*)$/u);
  if (!match) return null;
  return { marker: match[2][0], length: match[2].length, info: match[3].trim() };
}

function fenceEnd(line, opening) {
  const match = line.match(/^( {0,3})((?:\x60{3,}|~{3,}))\s*$/u);
  return Boolean(match && match[2][0] === opening.marker && match[2].length >= opening.length);
}

function fenceLanguage(info) {
  return String(info || "").split(/\s+/u, 1)[0].toLowerCase();
}

function looksLikeMermaid(source) {
  const first = normalizeNewlines(source)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("%%")) || "";
  return /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|kanban)\b/u.test(first);
}

function looksLikePlantUML(source) {
  return /^\s*@start\w+\b/iu.test(normalizeNewlines(source));
}

function isDiagramFence(language, source) {
  if (language === "mermaid") return true;
  if (language === "puml" || language === "plantuml") return true;
  if (!["diagram", "uml", "", "text", "plaintext"].includes(language)) return false;
  return looksLikeMermaid(source) || looksLikePlantUML(source);
}

function makeLineLinksAbsolute(line, siteOrigin) {
  const origin = new URL(siteOrigin).origin;
  return line
    .replace(/(\]\()\/(?!\/)/gu, "$1" + origin + "/")
    .replace(/((?:href|src)=["'])\/(?!\/)/giu, "$1" + origin + "/");
}

export function makeExternalLinksAbsolute(markdown, { siteOrigin = SITE_ORIGIN } = {}) {
  const lines = normalizeNewlines(markdown).split("\n");
  const out = [];
  for (let index = 0; index < lines.length;) {
    const opening = fenceStart(lines[index]);
    if (!opening) {
      out.push(makeLineLinksAbsolute(lines[index], siteOrigin));
      index += 1;
      continue;
    }
    const start = index;
    index += 1;
    while (index < lines.length && !fenceEnd(lines[index], opening)) index += 1;
    if (index < lines.length) index += 1;
    out.push(...lines.slice(start, index));
  }
  return out.join("\n");
}

export function assertNoUncompiledDiagrams(markdown, { platform = "generic" } = {}) {
  if (platform === "site") return;
  const lines = normalizeNewlines(markdown).split("\n");
  for (let index = 0; index < lines.length;) {
    const opening = fenceStart(lines[index]);
    if (!opening) {
      index += 1;
      continue;
    }
    const openingIndex = index;
    index += 1;
    while (index < lines.length && !fenceEnd(lines[index], opening)) index += 1;
    const hasClosingFence = index < lines.length;
    const closingIndex = hasClosingFence ? index : lines.length;
    const language = fenceLanguage(opening.info);
    const source = lines.slice(openingIndex + 1, closingIndex).join("\n");
    if (isDiagramFence(language, source)) {
      throw new Error(`Uncompiled diagram reached ${platform} output (${language || "diagram"} fence)`);
    }
    index = hasClosingFence ? closingIndex + 1 : closingIndex;
  }
}

export function compilePublishingMarkdown(markdown, {
  platform = "generic",
  siteOrigin = SITE_ORIGIN,
} = {}) {
  assertNoUncompiledDiagrams(markdown, { platform });
  return {
    platform,
    markdown: makeExternalLinksAbsolute(markdown, { siteOrigin }),
    assets: [],
  };
}
