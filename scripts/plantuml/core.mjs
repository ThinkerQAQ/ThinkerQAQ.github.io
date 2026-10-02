import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VERSION,
  normalizePlantUML,
  plantUMLDiagramKey,
} from "../../tools/blogctl/compiler/node/plantuml-domain.mjs";

export { VERSION };
export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const CACHE = path.join(ROOT, ".astro", "plantuml", "svg");
export const OUTPUT = path.join(ROOT, "public", "diagrams", "plantuml");
export const MANIFEST = path.join(ROOT, ".astro", "plantuml", "manifest.json");

export function log(operation, status, details = {}, severity = "info") {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), severity, operation, status, ...details }));
}

export function isPlantuml(node) {
  return node.type === "code" && /^(puml|plantuml)$/i.test(node.lang ?? "");
}

export function visitCode(tree, callback) {
  for (const [index, node] of (tree.children ?? []).entries()) {
    if (isPlantuml(node)) callback(node, tree, index);
    else if (node.children) visitCode(node, callback);
  }
}

export function normalize(source) {
  return normalizePlantUML(source);
}

export function diagramKey(source) {
  return plantUMLDiagramKey(source);
}

export function diagramUrl(key) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid diagram key");
  return `/diagrams/plantuml/${key}.svg`;
}

export function validateSvg(svg) {
  if (!/<svg\b[^>]*[\s\S]*<\/svg>/.test(svg) || /Syntax Error|An error has occurr?ed|Error line \d/i.test(svg)) {
    throw new Error("PlantUML did not return a valid diagram");
  }
  if (/<(?:script|foreignObject|!DOCTYPE|!ENTITY)\b|\son\w+\s*=|(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)) {
    throw new Error("SVG contains active content or external references");
  }
  return svg;
}
