import assert from "node:assert/strict";
import test from "node:test";
import markdownImageLoading from "./image-loading.mjs";

function image(properties = {}) {
  return { type: "element", tagName: "img", properties, children: [] };
}

test("keeps the first markdown image eager/default and lazily loads later images", () => {
  const first = image({ src: "/first.png" });
  const second = image({ src: "/second.png" });
  const third = image({ src: "/third.png", loading: "eager" });
  const tree = {
    type: "root",
    children: [
      first,
      { type: "element", tagName: "p", properties: {}, children: [second] },
      third,
    ],
  };

  markdownImageLoading()(tree);

  assert.equal(first.properties.loading, undefined);
  assert.equal(first.properties.decoding, "async");
  assert.equal(second.properties.loading, "lazy");
  assert.equal(second.properties.decoding, "async");
  assert.equal(third.properties.loading, "eager");
  assert.equal(third.properties.decoding, "async");
});
