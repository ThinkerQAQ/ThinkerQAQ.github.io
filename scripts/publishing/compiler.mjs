import { createHash } from "node:crypto";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const MERMAID_CLI_PACKAGE = "@mermaid-js/mermaid-cli@11.17.0";
export const MERMAID_ASSET_BASE_PATH = "/media/generated/mermaid";

function normalizeNewlines(value) {
  return String(value ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function fenceStart(line) {
  const match = line.match(/^( {0,3})(`{3,}|~{3,})([^\n]*)$/u);
  if (!match) return null;
  return {
    marker: match[2][0],
    length: match[2].length,
    info: match[3].trim(),
  };
}

function fenceEnd(line, opening) {
  const match = line.match(/^( {0,3})(`{3,}|~{3,})\s*$/u);
  return Boolean(
    match
      && match[2][0] === opening.marker
      && match[2].length >= opening.length,
  );
}

function fenceLanguage(info) {
  return String(info || "").split(/\s+/u, 1)[0].toLowerCase();
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
  return {
    title,
    description,
    alt: description || title || "Mermaid diagram",
  };
}

export function mermaidAssetForSource(source, {
  siteOrigin = SITE_ORIGIN,
  renderer = MERMAID_CLI_PACKAGE,
} = {}) {
  const normalizedSource = normalizeMermaidSource(source);
  const digest = createHash("sha256")
    .update(`${renderer}\n${normalizedSource}\n`)
    .digest("hex")
    .slice(0, 24);
  const publicPath = `${MERMAID_ASSET_BASE_PATH}/${digest}.png`;
  return {
    kind: "mermaid",
    id: digest,
    renderer,
    source: normalizedSource,
    publicPath,
    publicUrl: new URL(publicPath, siteOrigin).toString(),
    ...mermaidAccessibility(normalizedSource),
  };
}

function makeLineLinksAbsolute(line, siteOrigin) {
  const origin = new URL(siteOrigin).origin;
  return line
    .replace(/(\]\()\/(?!\/)/gu, `$1${origin}/`)
    .replace(/((?:href|src)=[\"'])\/(?!\/)/giu, `$1${origin}/`);
}

export function makeExternalLinksAbsolute(markdown, {
  siteOrigin = SITE_ORIGIN,
} = {}) {
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

export function collectPublishingAssets(markdown, {
  siteOrigin = SITE_ORIGIN,
} = {}) {
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
    const closingIndex = index < lines.length ? index : lines.length;

    if (fenceLanguage(opening.info) === "mermaid") {
      const source = lines.slice(openingIndex + 1, closingIndex).join("\n");
      const asset = mermaidAssetForSource(source, { siteOrigin });
      assets.set(asset.id, asset);
    }

    index = closingIndex < lines.length ? closingIndex + 1 : closingIndex;
  }

  return [...assets.values()];
}

export function compilePublishingMarkdown(markdown, {
  platform = "generic",
  siteOrigin = SITE_ORIGIN,
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

    if (language !== "mermaid" || platform === "site") {
      const end = hasClosingFence ? closingIndex + 1 : closingIndex;
      out.push(...lines.slice(openingIndex, end));
      index = end;
      continue;
    }

    const source = lines.slice(openingIndex + 1, closingIndex).join("\n");
    const asset = mermaidAssetForSource(source, { siteOrigin });
    assets.set(asset.id, asset);
    out.push(`![${asset.alt}](${asset.publicUrl})`);
    index = hasClosingFence ? closingIndex + 1 : closingIndex;
  }

  return {
    platform,
    markdown: out.join("\n"),
    assets: [...assets.values()],
  };
}
