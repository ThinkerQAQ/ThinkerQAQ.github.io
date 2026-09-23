import { createHash } from "node:crypto";

import {
  DEFAULT_R2_PUBLIC_BASE_URL,
  loadBlogctlPublishingRuntimeConfig,
} from "./runtime-config.mjs";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export { DEFAULT_R2_PUBLIC_BASE_URL };
export const MERMAID_CLI_PACKAGE = "@mermaid-js/mermaid-cli@11.17.0";
export const MERMAID_OBJECT_PREFIX = "generated/mermaid";

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

const MERMAID_FENCE_LANGUAGES = new Set(["mermaid", "diagram", "uml"]);

function looksLikeMermaid(source) {
  const first = normalizeNewlines(source)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("%%")) || "";
  return /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|kanban)\b/u.test(first);
}

function isMermaidFence(language, source) {
  if (language === "mermaid") return true;
  return MERMAID_FENCE_LANGUAGES.has(language) && looksLikeMermaid(source);
}

function isUnsupportedDiagramFence(language, source) {
  const normalized = normalizeNewlines(source).trimStart();
  if (language === "plantuml" || /^@startuml\b/u.test(normalized)) return true;
  return false;
}

function normalizeAssetBaseUrl(value) {
  const raw = String(value || DEFAULT_R2_PUBLIC_BASE_URL).trim();
  if (!raw) throw new Error("R2 public base URL is required");
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("R2 public base URL must use HTTPS");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}

function defaultAssetBaseUrl(env = process.env) {
  return loadBlogctlPublishingRuntimeConfig(env).assets.r2.publicBaseUrl;
}

export function normalizeMermaidSource(source) {
  const normalized = normalizeNewlines(source).trim();
  if (!normalized) throw new Error("Empty Mermaid diagram");
  return normalized;
}

export function mermaidAccessibility(source) {
  const normalized = normalizeMermaidSource(source);
  const title = normalized.match(/^\s*accTitle:\s*(.+?)\s*$/mu)?.[1]?.trim() || "";
  const description = normalized.match(/^\s*accDescr:\s*(.+?)\s*$/mu)?.[1]?.trim() || "";
  return { title, description, alt: description || title || "Mermaid diagram" };
}

export function mermaidAssetForSource(source, {
  assetBaseUrl = defaultAssetBaseUrl(),
  renderer = MERMAID_CLI_PACKAGE,
} = {}) {
  const normalizedSource = normalizeMermaidSource(source);
  const digest = createHash("sha256")
    .update(renderer + "\n" + normalizedSource + "\n")
    .digest("hex")
    .slice(0, 24);
  const objectKey = MERMAID_OBJECT_PREFIX + "/" + digest + ".png";
  return {
    kind: "mermaid",
    id: digest,
    renderer,
    source: normalizedSource,
    objectKey,
    publicUrl: new URL(objectKey, normalizeAssetBaseUrl(assetBaseUrl)).toString(),
    ...mermaidAccessibility(normalizedSource),
  };
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

export function collectPublishingAssets(markdown, options = {}) {
  const lines = normalizeNewlines(markdown).split("\n");
  const assets = new Map();
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
    const mermaid = isMermaidFence(language, source);
    if (mermaid && !hasClosingFence) throw new Error("Unclosed Mermaid fenced block");
    if (isUnsupportedDiagramFence(language, source)) {
      throw new Error("Unsupported PlantUML diagram: convert it to Mermaid before publishing");
    }
    if (mermaid) {
      const asset = mermaidAssetForSource(source, options);
      assets.set(asset.id, asset);
    }
    index = hasClosingFence ? closingIndex + 1 : closingIndex;
  }
  return [...assets.values()];
}

function escapeMarkdownAlt(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("]", "\\]").replace(/\s+/gu, " ").trim();
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
    if (isMermaidFence(language, source) || isUnsupportedDiagramFence(language, source)) {
      throw new Error(`Uncompiled diagram reached ${platform} output (${language || "diagram"} fence)`);
    }
    index = hasClosingFence ? closingIndex + 1 : closingIndex;
  }
}

export function compilePublishingMarkdown(markdown, {
  platform = "generic",
  siteOrigin = SITE_ORIGIN,
  assetBaseUrl = defaultAssetBaseUrl(),
} = {}) {
  const lines = normalizeNewlines(markdown).split("\n");
  const out = [];
  const assets = new Map();

  for (let index = 0; index < lines.length;) {
    const opening = fenceStart(lines[index]);
    if (!opening) {
      out.push(makeLineLinksAbsolute(lines[index], siteOrigin));
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
    const mermaid = isMermaidFence(language, source);

    if (mermaid && !hasClosingFence) throw new Error("Unclosed Mermaid fenced block");
    if (platform !== "site" && isUnsupportedDiagramFence(language, source)) {
      throw new Error("Unsupported PlantUML diagram: convert it to Mermaid before publishing");
    }

    if (!mermaid || platform === "site") {
      const end = hasClosingFence ? closingIndex + 1 : closingIndex;
      out.push(...lines.slice(openingIndex, end));
      index = end;
      continue;
    }

    const asset = mermaidAssetForSource(source, { assetBaseUrl });
    assets.set(asset.id, asset);
    out.push("![" + escapeMarkdownAlt(asset.alt) + "](" + asset.publicUrl + ")");
    index = hasClosingFence ? closingIndex + 1 : closingIndex;
  }

  return { platform, markdown: out.join("\n"), assets: [...assets.values()] };
}
