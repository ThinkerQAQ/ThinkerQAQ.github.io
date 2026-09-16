function isWideCodePoint(codePoint) {
  return codePoint >= 0x1100 && (
    codePoint <= 0x115f
    || codePoint === 0x2329
    || codePoint === 0x232a
    || (codePoint >= 0x2e80 && codePoint <= 0x3247 && codePoint !== 0x303f)
    || (codePoint >= 0x3250 && codePoint <= 0x4dbf)
    || (codePoint >= 0x4e00 && codePoint <= 0xa4c6)
    || (codePoint >= 0xa960 && codePoint <= 0xa97c)
    || (codePoint >= 0xac00 && codePoint <= 0xd7a3)
    || (codePoint >= 0xf900 && codePoint <= 0xfaff)
    || (codePoint >= 0xfe10 && codePoint <= 0xfe19)
    || (codePoint >= 0xfe30 && codePoint <= 0xfe6b)
    || (codePoint >= 0xff01 && codePoint <= 0xff60)
    || (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    || (codePoint >= 0x1b000 && codePoint <= 0x1b001)
    || (codePoint >= 0x1f200 && codePoint <= 0x1f251)
    || (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  );
}

function gridChildren(value) {
  const children = [];
  let narrowText = "";

  const flushNarrowText = () => {
    if (!narrowText) return;
    children.push({ type: "text", value: narrowText });
    narrowText = "";
  };

  for (const character of value) {
    if (!isWideCodePoint(character.codePointAt(0))) {
      narrowText += character;
      continue;
    }

    flushNarrowText();
    children.push({
      type: "element",
      tagName: "span",
      properties: { className: ["text-code-wide"] },
      children: [{ type: "text", value: character }],
    });
  }

  flushNarrowText();
  return children;
}

export default {
  name: "text-code-character-grid",
  element: {
    filter: ["pre"],
    visit(node, context) {
      const properties = node.properties ?? {};
      if (properties.dataLanguage !== "text") return;

      context.replaceNode(node, {
        type: "element",
        tagName: "pre",
        properties,
        children: [{
          type: "element",
          tagName: "code",
          properties: {},
          children: gridChildren(context.textContent(node)),
        }],
      });
    },
  },
};
