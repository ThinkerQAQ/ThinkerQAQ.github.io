import assert from "node:assert/strict";
import test from "node:test";

import worker from "./policy-worker.js";

const BLOG_ORIGIN = "https://thinkerqaq.github.io";

function makeRequest(question) {
  return new Request("https://example.workers.dev/chat", {
    method: "POST",
    headers: { "content-type": "application/json", origin: BLOG_ORIGIN },
    body: JSON.stringify({ question, turnstileToken: "valid-token" }),
  });
}

const cases = [
  ["Java runtime to CPU", "Java synchronized 从 JVM 一直下钻到 CPU 怎么实现？", "java-synchronized", "Synchronized 从 JVM 到 CPU", "synchronized 的语义、HotSpot 锁实现和 CPU 原子操作属于不同抽象层。"],
  ["Go runtime and architecture", "Go CAS 在 ARM64 上具体怎么实现？", "go-cas-arm64", "Go Atomic 从 Runtime 到 CPU", "Go atomic API、runtime 实现和 ARM64 原子指令需要区分语言语义与具体架构实现。"],
  ["MySQL specification and storage engine", "MySQL RR 和 RC 的保证是什么？InnoDB 是怎么实现的？", "database-isolation", "事务隔离与 InnoDB 实现", "事务隔离级别描述语义边界；InnoDB 使用 MVCC、Read View、undo log 与锁实现具体行为。"],
  ["Redis runtime and OS", "Redis 单线程到底是什么意思？继续下钻到 epoll。", "redis-event-loop", "Redis 事件循环与 IO 多路复用", "Redis 命令执行模型、事件循环与 Linux epoll 属于运行时和操作系统两个层级。"],
  ["Kafka protocol and implementation", "Kafka acks=all 保证了什么？ISR 是协议语义还是具体实现？", "kafka-replication", "Kafka 副本、ISR 与确认语义", "acks 描述生产者确认语义；ISR 和副本同步机制属于 Kafka 的具体协议与实现。"],
];

function makeEnv(slug, title, source, capture) {
  return {
    ALLOWED_ORIGINS: BLOG_ORIGIN,
    BLOG_ORIGIN,
    TURNSTILE_SECRET_KEY: "test-secret",
    AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
    AI_SEARCH: {
      get: () => ({
        search: async () => ({ chunks: [{
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
        }] }),
      }),
    },
    AI: {
      run: async (_model, options) => {
        capture.system = options.messages[0].content;
        capture.user = options.messages[1].content;
        return { response: "回答需要保持抽象层级和作用域边界。[1]" };
      },
    },
  };
}

function checkPolicy(systemMessage) {
  for (const text of [
    "TECHNICAL_CONTEXT_SCHEMA",
    "levels=concept > specification > api > runtime > operating-system > hardware",
    "claim_classes=guarantee | implementation | example",
    "Identify the abstraction level requested by the current question",
    "Do not treat one concrete implementation as a universal guarantee",
    "whole-algorithm or whole-system property",
    "architecture, version, runtime, storage engine, protocol, or operating system",
    "progressively from semantics to implementation to lower-level mechanisms",
    "Use only the current retrieved sources as factual evidence",
    "Preserve differences between platforms or implementations",
  ]) {
    assert.ok(systemMessage.includes(text), text);
  }
  assert.ok(!systemMessage.includes("using CAS does not by itself prove"));
}

test("applies one answer policy across Java, Go, MySQL, Redis and Kafka", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ success: true, hostname: "thinkerqaq.github.io", action: "ask_blog" });

  try {
    for (const [name, question, slug, title, source] of cases) {
      const capture = { system: "", user: "" };
      const response = await worker.fetch(makeRequest(question), makeEnv(slug, title, source, capture));
      assert.equal(response.status, 200, name);
      checkPolicy(capture.system);
      assert.ok(capture.user.includes(question), name);
      assert.ok(capture.user.includes(source), name);
      const payload = await response.json();
      assert.equal(payload.sources[0].title, title, name);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
