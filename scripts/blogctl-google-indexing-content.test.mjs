import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const contentScriptPath = new URL("../tools/blogctl/extension/google-indexing-content.js", import.meta.url);
const backgroundPath = new URL("../tools/blogctl/extension/background.js", import.meta.url);

class FakeElement {
  constructor(tagName = "div", { text = "", attrs = {}, onClick = null } = {}) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.textContent = text;
    this.attrs = new Map(Object.entries(attrs));
    this.onClick = onClick;
  }

  getAttribute(name) {
    return this.attrs.has(name) ? this.attrs.get(name) : null;
  }

  hasAttribute(name) {
    return this.attrs.has(name);
  }

  getBoundingClientRect() {
    return { width: 240, height: 32 };
  }

  click() {
    this.onClick?.();
  }

  focus() {}

  dispatchEvent() {
    return true;
  }
}

class FakeInputElement extends FakeElement {
  constructor(options = {}) {
    super("input", options);
    this.value = "";
  }

  select() {}
}

class FakeTextAreaElement extends FakeInputElement {
  constructor(options = {}) {
    super(options);
    this.tagName = "TEXTAREA";
  }
}

function matchesSelector(node, selector) {
  if (selector === "button") return node.tagName === "BUTTON";
  if (selector === 'input:not([type="hidden"])') {
    return node.tagName === "INPUT" && node.getAttribute("type") !== "hidden";
  }
  if (selector === "textarea") return node.tagName === "TEXTAREA";
  if (selector === '[contenteditable="true"]') return node.getAttribute("contenteditable") === "true";
  if (selector === "[aria-label]") return node.getAttribute("aria-label") !== null;
  if (selector === "[title]") return node.getAttribute("title") !== null;
  const role = selector.match(/^\[role="([^"]+)"\]$/u)?.[1];
  if (role) return node.getAttribute("role") === role;
  const tabindex = selector.match(/^\[tabindex="([^"]+)"\]$/u)?.[1];
  if (tabindex) return node.getAttribute("tabindex") === tabindex;
  return false;
}

async function createHarness({ bodyText = "", nodes = [] } = {}) {
  const source = await readFile(contentScriptPath, "utf8");
  let listener = null;
  const body = { innerText: bodyText };
  const document = {
    body,
    documentElement: body,
    title: "Google Search Console",
    querySelectorAll(selector) {
      return nodes.filter((node) => matchesSelector(node, selector));
    },
    execCommand() {
      return false;
    },
  };
  const chrome = {
    runtime: {
      onMessage: {
        addListener(fn) {
          listener = fn;
        },
      },
      sendMessage() {
        return Promise.resolve({ ok: true });
      },
    },
  };
  class FakeEvent {
    constructor(type, init = {}) {
      this.type = type;
      Object.assign(this, init);
    }
  }
  const context = vm.createContext({
    chrome,
    console,
    document,
    Element: FakeElement,
    HTMLInputElement: FakeInputElement,
    HTMLTextAreaElement: FakeTextAreaElement,
    Event: FakeEvent,
    InputEvent: FakeEvent,
    KeyboardEvent: FakeEvent,
    getComputedStyle() {
      return { display: "block", visibility: "visible", opacity: "1" };
    },
    location: {
      hostname: "search.google.com",
      pathname: "/search-console/inspect",
    },
    setTimeout,
    clearTimeout,
    URL,
  });
  vm.runInContext(source, context, { filename: "google-indexing-content.js" });
  assert.equal(typeof listener, "function", "content script should register its runtime listener");

  return {
    body,
    nodes,
    async send(message) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("content-script response timed out")), 5000);
        const sendResponse = (value) => {
          clearTimeout(timer);
          resolve(value);
        };
        const handled = listener(message, {}, sendResponse);
        assert.equal(handled, true);
      });
    },
  };
}

test("GSC probe accepts an already-open Chinese inspection result page without a textbox", async () => {
  const url = "https://thinkerqaq.github.io/about/";
  const requestButton = new FakeElement("button", { text: "请求编入索引" });
  const harness = await createHarness({
    bodyText: `${url} 网址尚未收录到 Google 请求编入索引`,
    nodes: [requestButton],
  });

  const result = await harness.send({ type: "blogctl.google.index.probe" });
  assert.equal(result.ok, true);
  assert.equal(result.ready, true);
  assert.equal(result.inspectionInput, false);
  assert.equal(result.inspectionState, "not_indexed");
  assert.equal(result.hasRequestButton, true);
});

test("Request Indexing resume reuses the current matching result and clicks 请求编入索引", async () => {
  const url = "https://thinkerqaq.github.io/about/";
  let clicked = 0;
  const harness = await createHarness({
    bodyText: `${url} 网址尚未收录到 Google 请求编入索引`,
  });
  const requestButton = new FakeElement("button", {
    text: "请求编入索引",
    onClick() {
      clicked += 1;
      harness.body.innerText = `${url} 已提交编入索引请求`;
    },
  });
  harness.nodes.push(requestButton);

  const result = await harness.send({ type: "blogctl.google.index.request", url });
  assert.equal(clicked, 1);
  assert.equal(result.ok, true);
  assert.equal(result.action, "requested_indexing");
  assert.equal(result.stage, "request_result");
});

test("GSC overview probe activates the custom 检查网址 control and discovers the real input", async () => {
  const harness = await createHarness({ bodyText: "Google Search Console 概述" });
  const trigger = new FakeElement("button", {
    text: "检查网址",
    onClick() {
      harness.nodes.push(new FakeInputElement({
        attrs: { "aria-label": "检查网址", role: "searchbox" },
      }));
    },
  });
  harness.nodes.push(trigger);

  const result = await harness.send({ type: "blogctl.google.index.probe" });
  assert.equal(result.ok, true);
  assert.equal(result.ready, true);
  assert.equal(result.inspectionInput, true);
});

test("Request Indexing start/resume preflight GSC before moving the bridge queue to running", async () => {
  const source = await readFile(backgroundPath, "utf8");
  for (const marker of [
    'case "blogctl.index.google.request.start":',
    'case "blogctl.index.google.request.resume":',
    'case "blogctl.job.resume":',
  ]) {
    const start = source.indexOf(marker);
    assert.notEqual(start, -1, `missing ${marker}`);
    const block = source.slice(start, start + 1800);
    const preflight = block.indexOf("ensureGoogleSearchConsoleReady");
    const mutation = Math.min(
      ...["/request-queue/start", "/request-queue/resume", "/resume"].map((needle) => {
        const index = block.indexOf(needle);
        return index < 0 ? Number.POSITIVE_INFINITY : index;
      }),
    );
    assert.ok(preflight >= 0, `${marker} should preflight GSC`);
    assert.ok(preflight < mutation, `${marker} should preflight before queue/job resume`);
  }
  assert.match(source, /request-queue\/pause/u);
  assert.match(source, /gsc queue pump failed/u);
});
