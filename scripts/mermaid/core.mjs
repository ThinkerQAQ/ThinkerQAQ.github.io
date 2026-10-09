import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "12.0.0";
export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const CACHE = path.join(ROOT, ".astro", "mermaid", "svg");
export const OUTPUT = path.join(ROOT, "public", "diagrams", "mermaid");
export const MANIFEST = path.join(ROOT, ".astro", "mermaid", "manifest.json");
export const CLI = path.join(ROOT, "node_modules", "@mermaid-js", "mermaid-cli", "src", "cli.js");
export const CONFIG = Object.freeze({ securityLevel: "strict", theme: "default" });

export function normalize(source) {
  const text = String(source || "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if (!text) throw new Error("Empty Mermaid diagram");
  return text + "\n";
}

export function diagramKey(source) {
  const data = "mermaid:" + VERSION + ":strict:svg:no-font-embed:1200:v1\n" + normalize(source);
  return createHash("sha256").update(data).digest("hex");
}

export function diagramUrl(key) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid diagram key");
  return "/diagrams/mermaid/" + key + ".svg";
}

export function validateSvg(svg) {
  if (!/<svg\b[^>]*[\s\S]*<\/svg>/.test(svg)) throw new Error("Mermaid did not return a valid SVG");
  // SVG is loaded as an image, never injected into the DOM.
  if (/<(?:script|!DOCTYPE|!ENTITY)\b|\son\w+\s*=|javascript:|(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)) {
    throw new Error("Mermaid SVG contains active content or external references");
  }
  return svg;
}
