import assert from "node:assert/strict";
import test from "node:test";

import {
  botObservationInternals,
  buildBotObservationReport,
  observeAnalyticsBeacon,
} from "./bot-observation.js";

class MemoryKv {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key) ?? null;
  }

  async put(key, value) {
    this.data.set(key, String(value));
  }

  async list({ prefix = "" } = {}) {
    return {
      keys: [...this.data.keys()]
        .filter(key => key.startsWith(prefix))
        .map(name => ({ name })),
      list_complete: true,
      cursor: "",
    };
  }
}

function requestFor({ ip, ua = "Mozilla/5.0", country = "SG", verifiedBot = false }) {
  const request = new Request("https://worker.example/api/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": ip,
      "user-agent": ua,
    },
    body: "{}",
  });
  Object.defineProperty(request, "cf", {
    value: {
      country,
      botManagement: { verifiedBot },
    },
  });
  return request;
}

function pageview(path) {
  return new TextEncoder().encode(
    JSON.stringify({
      type: "event",
      payload: {
        url: path,
      },
    }),
  );
}

test("collapses repeated traffic from one IP+UA into one anonymous client", async () => {
  const kv = new MemoryKv();
  const env = { ANALYTICS_KV: kv };
  const base = Date.parse("2026-09-24T08:00:00Z");

  for (let i = 0; i < 5; i += 1) {
    const result = await observeAnalyticsBeacon(
      requestFor({ ip: "203.0.113.10" }),
      env,
      pageview(`/notes/${i}/`),
      base + i * 60_000,
    );
    assert.equal(result.observed, true);
    assert.equal(result.shouldBlock, false);
  }

  const report = await buildBotObservationReport(env, base + 10 * 60_000);
  assert.equal(report.clientsObserved, 1);
  assert.equal(report.totalObservedPageviews, 5);
  assert.equal(report.largestClientPageviewShare, 1);
  assert.equal(report.suspectedClients, 0);
});

test("blocks a rapid distinct-path scanner before forwarding more Umami traffic", async () => {
  const kv = new MemoryKv();
  const env = { ANALYTICS_KV: kv };
  const base = Date.parse("2026-09-24T08:00:00Z");
  let firstBlockedAt = null;

  for (let i = 0; i < 16; i += 1) {
    const result = await observeAnalyticsBeacon(
      requestFor({ ip: "203.0.113.20" }),
      env,
      pageview(`/notes/scan-${i}/`),
      base + i * 30_000,
    );
    if (result.shouldBlock && firstBlockedAt == null) firstBlockedAt = i + 1;
  }

  assert.equal(firstBlockedAt, 15);

  const report = await buildBotObservationReport(env, base + 10 * 60_000);
  assert.equal(report.clientsObserved, 1);
  assert.equal(report.suspectedClients, 1);
  assert.equal(report.dominantSingleClient, true);
  assert.ok(report.blockedHits >= 2);
  assert.deepEqual(report.topSuspected[0].reasons, ["rapid_distinct_path_scan"]);
  assert.equal("clientTag" in report.topSuspected[0], false);
});

test("obvious automation user agents are filtered immediately", async () => {
  const kv = new MemoryKv();
  const env = { ANALYTICS_KV: kv };
  const result = await observeAnalyticsBeacon(
    requestFor({
      ip: "203.0.113.30",
      ua: "Mozilla/5.0 HeadlessChrome/153.0",
    }),
    env,
    pageview("/notes/test/"),
    Date.parse("2026-09-24T08:00:00Z"),
  );

  assert.equal(result.shouldBlock, true);
  assert.ok(result.state.reasons.includes("automation_user_agent"));
});

test("verified bots are observed but never filtered", async () => {
  const kv = new MemoryKv();
  const env = { ANALYTICS_KV: kv };
  const now = Date.parse("2026-09-24T08:00:00Z");
  const result = await observeAnalyticsBeacon(
    requestFor({
      ip: "203.0.113.40",
      ua: "ExampleBot/1.0",
      verifiedBot: true,
    }),
    env,
    pageview("/robots-safe/"),
    now,
  );

  assert.equal(result.shouldBlock, false);

  const report = await buildBotObservationReport(env, now + 60_000);
  assert.equal(report.clientsObserved, 1);
  assert.equal(report.suspectedClients, 0);
  assert.equal(report.blockedHits, 0);
});

test("different IPs remain separate anonymous clients", async () => {
  const kv = new MemoryKv();
  const env = { ANALYTICS_KV: kv };
  const now = Date.parse("2026-09-24T08:00:00Z");

  await observeAnalyticsBeacon(
    requestFor({ ip: "203.0.113.50" }),
    env,
    pageview("/a/"),
    now,
  );
  await observeAnalyticsBeacon(
    requestFor({ ip: "203.0.113.51" }),
    env,
    pageview("/b/"),
    now,
  );

  const report = await buildBotObservationReport(env, now + 60_000);
  assert.equal(report.clientsObserved, 2);
  assert.equal(report.totalObservedPageviews, 2);
  assert.equal(report.largestClientPageviewShare, 0.5);
});


test("classifies common crawler families without exposing full user agents", async () => {
  const cases = [
    ["Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)", "yandex"],
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "google"],
    ["Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", "bing"],
    ["Mozilla/5.0 AppleWebKit/537.36; compatible; GPTBot/1.2", "openai"],
    ["Mozilla/5.0; compatible; ClaudeBot/1.0", "anthropic"],
    ["Mozilla/5.0 HeadlessChrome/153.0", "unknown"],
  ];

  for (const [ua, expected] of cases) {
    assert.equal(botObservationInternals.classifyBotFamily(ua), expected);
  }

  const kv = new MemoryKv();
  const env = { ANALYTICS_KV: kv };
  const now = Date.parse("2026-09-24T08:00:00Z");

  await observeAnalyticsBeacon(
    requestFor({
      ip: "203.0.113.60",
      ua: "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
      country: "RU",
    }),
    env,
    pageview("/notes/yandex/"),
    now,
  );

  const report = await buildBotObservationReport(env, now + 60_000);
  assert.equal(report.topSuspected[0].botFamily, "yandex");
  assert.equal("userAgent" in report.topSuspected[0], false);
  assert.equal("clientTag" in report.topSuspected[0], false);
});
