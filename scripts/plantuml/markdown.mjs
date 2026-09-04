import { existsSync } from "node:fs";
import path from "node:path";
import { CACHE, diagramKey, diagramUrl, isPlantuml } from "./core.mjs";

export function diagramImage(node, file = "Markdown") {
      const key = diagramKey(node.value);
      if (!existsSync(path.join(CACHE, `${key}.svg`))) {
        throw new Error(`${file}:${node.position?.start.line ?? "?"}: PlantUML cache missing. Run npm run diagrams, then restart the dev server/build.`);
      }
      const url = diagramUrl(key);
      return {
        type: "paragraph",
        data: { hProperties: { className: ["plantuml-diagram"] } },
        children: [{ type: "link", url, title: "查看完整图表", children: [{ type: "image", url, alt: node.meta?.trim() || "PlantUML 图表", title: null }] }],
      };
}

export default function plantumlMarkdown({ fileURL }) {
  return {
    name: "plantuml-static-images",
    options: { position: true },
    code(node) {
      if (isPlantuml(node)) return diagramImage(node, fileURL?.pathname ?? "Markdown");
    },
  };
}
