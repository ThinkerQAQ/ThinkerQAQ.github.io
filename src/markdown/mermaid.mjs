import { existsSync } from "node:fs";
import path from "node:path";
import { CACHE, diagramKey, diagramUrl } from "../../scripts/mermaid/core.mjs";

export function isMermaid(node) {
  return node.type === "code" && /^mermaid$/i.test(node.lang ?? "");
}

export function mermaidBlock(node, file = "Markdown") {
  const key = diagramKey(node.value);
  if (!existsSync(path.join(CACHE, key + ".svg")) && process.env.NODE_ENV !== "development") {
    throw new Error(file + ":" + (node.position?.start.line ?? "?") + ": Mermaid cache missing. Run npm run diagrams, then restart the dev server/build.");
  }
  const url = diagramUrl(key);
  return {
    type: "paragraph",
    data: { hProperties: { className: ["mermaid-diagram"] } },
    children: [{
      type: "link", url, title: "查看完整图表",
      children: [{ type: "image", url, alt: node.meta?.trim() || "Mermaid 图表", title: null }],
    }],
  };
}

export default function mermaidMarkdown({ fileURL } = {}) {
  return {
    name: "mermaid-static-images",
    options: { position: true },
    code(node) {
      if (isMermaid(node)) return mermaidBlock(node, fileURL?.pathname ?? "Markdown");
    },
  };
}
