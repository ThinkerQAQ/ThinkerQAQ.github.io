import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const astro = await readFile(new URL("./ContentReaction.astro", import.meta.url), "utf8");
const script = astro.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(script, "reaction runtime is embedded in the Astro component");

function element() {
  const handlers = {};
  return {
    dataset: {},
    disabled: false,
    hidden: false,
    textContent: "",
    handlers,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    addEventListener(name, handler) { handlers[name] = handler; },
    async click() { return handlers.click?.(); },
  };
}

function harness(fetchStub, { noObserver = false } = {}) {
  const button = element();
  const retry = element();
  retry.hidden = true;
  const status = element();
  const count = element();
  const elements = {
    "[data-reaction-button]": button,
    "[data-reaction-retry]": retry,
    "[data-reaction-status]": status,
    "[data-reaction-count]": count,
  };
  const root = {
    dataset: {
      endpoint: "https://api.example",
      contentType: "article",
      contentId: "concurrency-series-07-volatile",
      errorLabel: "暂时无法连接点赞服务，请重试。",
      loadingLabel: "正在加载有帮助数量",
    },
    classList: { toggle() {} },
    querySelector(selector) { return elements[selector]; },
  };
  const timeouts = new Map();
  let nextTimer = 1;
  let observer;
  class FakeIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      observer = this;
    }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    trigger(visible = true) { this.callback([{ isIntersecting: visible }]); }
  }
  const windowStub = {
    setTimeout(callback, timeout) {
      const id = nextTimer++;
      timeouts.set(id, {callback, timeout});
      return id;
    },
    clearTimeout(id) { timeouts.delete(id); },
    matchMedia() { return { matches: true }; },
    ...(noObserver ? {} : { IntersectionObserver: FakeIntersectionObserver }),
  };
  const calls = [];
  const stub = async (url, options) => {
    calls.push({ url: String(url), ...options });
    return fetchStub(url, options, calls.length);
  };
  runInNewContext(script, {
    document: {querySelectorAll() { return [root]; }},
    window: windowStub,
    fetch: stub,
    crypto: { randomUUID() { return "test-visitor-id"; }},
    localStorage: {
      getItem() { return null; },
      setItem() {},
    },
    AbortController,
    URL,
    Uint8Array,
    IntersectionObserver: FakeIntersectionObserver,
  });
  return { root, button, retry, status, count, calls, timeouts, get observer() { return observer; } };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
}

test("reaction GET waits for viewport and keeps button disabled while state is unknown", async () => {
  const h = harness(async () => ({
    ok: true,
    json: async () => ({ reacted: false, count: 2 }),
  }));
  assert.equal(h.calls.length, 0);
  assert.equal(h.button.disabled, true);
  assert.equal(h.observer.target, h.root);
  assert.equal(h.observer.options.rootMargin, "400px 0px");
  h.observer.trigger(false);
  assert.equal(h.calls.length, 0);
  h.observer.trigger(true);
  await settle();
  assert.equal(h.calls.length, 1);
  assert.match(h.calls[0].url, /v1\/reactions\?contentType=article&contentId=/);
  assert.equal(h.button.disabled, false);
  assert.equal(h.root.dataset.loaded, "true");
  assert.equal(h.count.textContent, "2");
  assert.equal(h.observer.disconnected, true);
});

test("timed-out GET shows retry; retry loads server state and restores button", async () => {
  const h = harness(async (_url, options, number) => {
    if (number === 1) {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }
    return { ok: true, json: async () => ({ reacted: false, count: 3 }) };
  });
  h.observer.trigger();
  await settle();
  assert.equal(h.calls.length, 1);
  const pending = [...h.timeouts.values()][0];
  assert.equal(pending.timeout, 4000);
  pending.callback();
  await settle();
  assert.equal(h.button.disabled, true);
  assert.equal(h.retry.hidden, false);
  assert.match(h.status.textContent, /请重试/);

  await h.retry.click();
  assert.equal(h.root.dataset.loaded, "true");
  assert.equal(h.retry.hidden, true);
  assert.equal(h.button.disabled, false);
  assert.equal(h.count.textContent, "3");
  assert.equal(h.timeouts.size, 0);
});

test("optimistic PUT/DELETE follow loaded state and use bounded timeouts", async () => {
  const h = harness(async (_url, options) => {
    if (options.method === "GET") return {ok: true, json: async () => ({reacted: false, count: 0})};
    if (options.method === "PUT") {
      assert.equal([...h.timeouts.values()][0].timeout, 6000);
      return {ok: true, json: async () => ({reacted: true, count: 1})};
    }
    return {ok: true, json: async () => ({reacted: false, count: 0})};
  }, { noObserver: true });
  await settle();
  assert.equal(h.calls.length, 1);
  await h.button.click();
  assert.equal(h.calls[1].method, "PUT");
  assert.equal(h.root.dataset.reacted, "true");
  await h.button.click();
  assert.equal(h.calls[2].method, "DELETE");
  assert.equal(h.root.dataset.reacted, "false");
});

test("failed write rolls back the optimistic state and enables another attempt", async () => {
  const h = harness(async (_url, options) => {
    if (options.method === "GET") return {ok: true, json: async () => ({reacted: false, count: 2})};
    throw new Error("network disconnected");
  }, {noObserver: true});
  await settle();
  await h.button.click();
  assert.equal(h.root.dataset.reacted, "false");
  assert.equal(h.root.dataset.count, "2");
  assert.equal(h.button.disabled, false);
  assert.match(h.status.textContent, /请重试/);
});
