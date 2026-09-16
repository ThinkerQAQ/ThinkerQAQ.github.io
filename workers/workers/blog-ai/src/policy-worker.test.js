import assert from "node:assert/strict";
import test from "node:test";

import worker from "./policy-worker.js";

const BLOG_ORIGIN = "https://thinkerqaq.github.io";

function request(body) {
  return new Request("https://example.workers.dev/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BLOG_ORIGIN,
    },
    body: JSON.stringify(body),
  });
}

test("adds a domain-neutral abstraction and scope schema to generated answers", async () => {
  const originalFetch = globalThis.fetch;
  let systemMessage = "";

  globalThis.fetch = async () => Response.json({
    success: true,
    hostname: "thinkerqaq.github.io",
    action: "ask_blog",
  });

  try {
    const response = await worker.fetch(
      request({
        question: "MySQL InnoDB 的事务隔离是规范保证还是具体实现？",
        turnstileToken: "valid-token",
      }),
      {
        ALLOWED_ORIGINS: BLOG_ORIGIN,
        BLOG_ORIGIN,
        TURNSTILE_SECRET_KEY: "test-secret",
        AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
        AI_SEARCH: {
          get: () => ({
            search: async () => ({
              chunks: [{
                text: "事务隔离级别描述语义边界；InnoDB 使用 MVCC 与锁实现其中一部分行为。",
                item: {
                  key: "blog--articles--database-isolation.md",
                  metadata: {
                    source_url: `${BLOG_ORIGIN}/articles/database-isolation/`,
                    title: "事务隔离与 InnoDB 实现",
                    collection: "articles",
                    priority: 2,
                    schema_version: 2,
                  },
                },
              }],
            }),
          }),
        },
        AI: {
          run: async (_model, options) => {
            systemMessage = options.messages[0].content;
            return { response: "隔离级别的语义与 InnoDB 的具体实现需要分开讨论。[1]" };
          },
        },
      },
    );

    assert.equal(response.status, 200);
    assert.match(systemMessage, /TECHNICAL_CONTEXT_SCHEMA/);
    assert.match(systemMessage, /levels=concept > specification > api > runtime > operating-system > hardware/);
    assert.match(systemMessage, /answer_depth=requested-level/);
    assert.match(systemMessage, /claim_classes=guarantee \| implementation \| example/);
    assert.match(systemMessage, /scope_dimensions=architecture \| version \| runtime \| storage-engine \| protocol \| operating-system/);
    assert.match(systemMessage, /component_to_system_inference=disallowed/);
    assert.match(systemMessage, /internals_path=semantics > implementation > lower-level-mechanism/);

    const payload = await response.json();
    assert.equal(payload.sources[0].title, "事务隔离与 InnoDB 实现");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
