export function isMermaid(node) {
  return node.type === "code" && /^mermaid$/i.test(node.lang ?? "");
}

export function mermaidBlock(node, file = "Markdown") {
  const source = node.value.replaceAll("\\r\\n", "\\n");
  if (!source.trim()) {
    throw new Error(`${file}:${node.position?.start.line ?? "?"}: Empty Mermaid diagram`);
  }

  return {
    type: "paragraph",
    data: {
      hName: "pre",
      hProperties: {
        className: ["mermaid", "mermaid-diagram"],
      },
    },
    children: [{ type: "text", value: source }],
  };
}

export default function mermaidMarkdown({ fileURL } = {}) {
  return {
    name: "mermaid-browser-diagrams",
    options: { position: true },
    code(node) {
      if (isMermaid(node)) {
        return mermaidBlock(node, fileURL?.pathname ?? "Markdown");
      }
    },
  };
}
