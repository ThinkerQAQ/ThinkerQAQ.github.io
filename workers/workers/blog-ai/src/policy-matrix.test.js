import assert from "node:assert/strict";
import test from "node:test";

import worker from "./policy-worker.js";

const BLOG_ORIGIN = "https://thinkerqaq.github.io";

const cases = [
  ["Java", "Java synchronized 从 JVM 一直下钻到 CPU 怎么实现？", "java-sync", "Java synchronized", "JVM 与 CPU 属于不同抽象层。"],
  ["Go", "Go CAS 在 ARM64 上具体怎么实现？", "go-cas", "Go CAS", "Go runtime 与 ARM64 指令属于不同层级。"],
  ["MySQL", "MySQL RR 和 RC 的保证是什么？InnoDB 是怎么实现的？", "mysql-isolation", "MySQL 隔离级别", "隔离语义与 InnoDB 实现需要区分。"],
  ["Redis", "Redis 单线程到底是什么意思？继续下钻到 epoll。", "redis-event-loop", "Redis 事件循环", "Redis runtime 与 Linux epoll 需要区分。"],
  ["Kafka", "Kafka acks=all 保证了什么？ISR 是协议语义还是具体实现？", "kafka-replication", "Kafka 副本机制", "确认语义与 ISR 实现需要区分。"],
];

function request(question) {
  return new Request("https://example.workers.dev/chat", {
    method: "POST",
    headers: { "content-type": "application/json", origin: BLOG_ORIGIN },
    body: JSON.stringify({ question, turnstileToken: "valid-token" }),
  });
}

function envFor(slug, title, source, capture) {
  return {
    ALLOWED_ORIGINS: BLOG_ORIGIN,
    BLOG_ORIGIN,
    TURNSTILE_SECRET_KEY: "test-secret",
    AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
    AI_SEARCH: {
      get: () => ({
        search: async () => ({
          chunks: [{
            text: source,
            item: {
              key: `blog--articles--${slug}.md`,
              metadata: {
                source_url: `${BLOG_ORIGIN}/articles/${slug}/`,
                title,
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
        capture.system = options.messages[0].content;
        capture.user = options.messages[1].content;
        return { response: "基于当前来源回答，并保持抽象层级边界。[1]" };
      },
    },
  };
}

test("applies the same abstraction policy across Java, Go, MySQL, Redis and Kafka", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    success: true,
    hostname: "thinkerqaq.github.io",
    action: "ask_blog",
  });

  try {
    for (const [name, question, slug, title, source] of cases) {
      const capture = { system: "", user: "" };
      const response = await worker.fetch(request(question), envFor(slug, title, source, capture));

      assert.equal(response.status, 200, name);
      for (const marker of [
        "TECHNICAL_CONTEXT_SCHEMA",
        "levels=concept > specification > api > runtime > operating-system > hardware",
        "answer_depth=requested-level",
        "evidence_limit=current-sources",
        "claim_classes=guarantee | implementation | example",
        "scope_dimensions=architecture | version | runtime | storage-engine | protocol | operating-system",
        "layer_equivalence=disallowed",
        "component_to_system_inference=disallowed",
        "internals_path=semantics > implementation > lower-level-mechanism",
        "preserve_scope_differences=true",
      ]) {
        assert.ok(capture.system.includes(marker), `${name}: ${marker}`);
      }
      assert.ok(capture.user.includes(question), name);
      assert.ok(capture.user.includes(source), name);

      const payload = await response.json();
      assert.equal(payload.sources[0].title, title, name);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
