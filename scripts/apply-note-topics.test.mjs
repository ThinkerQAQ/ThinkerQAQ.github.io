import assert from "node:assert/strict";
import test from "node:test";

import { applyTopicFrontmatter } from "./apply-note-topics.mjs";
import { NOTE_TOPIC_OVERRIDES, REVIEWED_NOTE_PATHS } from "./content-policy.mjs";

test("Go publishes exactly the reviewed 42-note knowledge set", () => {
  assert.equal(REVIEWED_NOTE_PATHS.Golang.size, 42);
  assert.equal(NOTE_TOPIC_OVERRIDES.Golang.size, 42);
  assert.equal(REVIEWED_NOTE_PATHS.Golang.has("Golang/channel.md"), true);
  assert.equal(REVIEWED_NOTE_PATHS.Golang.has("Golang/GMP.md"), true);
  assert.equal(REVIEWED_NOTE_PATHS.Golang.has("Golang/pprof.md"), true);
  assert.equal(REVIEWED_NOTE_PATHS.Golang.has("Golang/json.md"), false);
  assert.equal(REVIEWED_NOTE_PATHS.Golang.has("Golang/Golang微服务/consul.md"), false);
  assert.equal(REVIEWED_NOTE_PATHS.Golang.has("Golang/sync.singleflight.md"), false);
});

test("Go topic taxonomy is explicit and independent from VNote folders", () => {
  assert.deepEqual(NOTE_TOPIC_OVERRIDES.Golang.get("slice.md"), {
    id: "language",
    label: "Language",
    number: 1,
  });
  assert.deepEqual(NOTE_TOPIC_OVERRIDES.Golang.get("channel.md"), {
    id: "concurrency",
    label: "Concurrency",
    number: 2,
  });
  assert.deepEqual(NOTE_TOPIC_OVERRIDES.Golang.get("GC.md"), {
    id: "runtime",
    label: "Runtime",
    number: 3,
  });
  assert.deepEqual(NOTE_TOPIC_OVERRIDES.Golang.get("pprof.md"), {
    id: "performance",
    label: "Performance",
    number: 4,
  });
});

test("rewrites imported root-note frontmatter into public topic metadata", () => {
  const source = `---\ntitle: "1.7 channel"\ndescription: "x"\nsourcePath: "Golang/channel.md"\ncategory: "go"\ncategoryLabel: "Go"\ntopic: "__root"\ntopicLabel: "1.Language"\norder: 7\n---\n\nbody\n`;
  const applied = applyTopicFrontmatter(
    source,
    "channel",
    { id: "concurrency", label: "Concurrency", number: 2 },
    3,
    16,
  );
  assert.match(applied.markdown, /^title: "2\.3 channel"$/m);
  assert.match(applied.markdown, /^topic: "concurrency"$/m);
  assert.match(applied.markdown, /^topicLabel: "2\.Concurrency"$/m);
  assert.match(applied.markdown, /^order: 16$/m);
});
