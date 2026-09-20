export default function markdownImageLoading() {
  return (tree) => {
    let imageIndex = 0;

    const visit = (node) => {
      if (!node || typeof node !== "object") return;

      if (node.type === "element" && node.tagName === "img") {
        node.properties ??= {};
        if (node.properties.decoding == null) {
          node.properties.decoding = "async";
        }

        if (imageIndex > 0 && node.properties.loading == null) {
          node.properties.loading = "lazy";
        }

        imageIndex += 1;
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    };

    visit(tree);
  };
}
