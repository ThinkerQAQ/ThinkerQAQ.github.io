"use strict";

(() => {
  if (globalThis.__BLOGCTL_GOOGLE_INDEXING_CONTENT__) return;
  globalThis.__BLOGCTL_GOOGLE_INDEXING_CONTENT__ = true;

  const TEXT = {
    indexed: [
      "url is on google",
      "网址在 google 上",
      "网址已在 google 上",
    ],
    notIndexed: [
      "url is not on google",
      "网址不在 google 上",
      "网址未在 google 上",
    ],
    request: [
      "request indexing",
      "请求编入索引",
      "申请编入索引",
    ],
    requested: [
      "indexing requested",
      "已请求编入索引",
      "已申请编入索引",
      "已提交编入索引请求",
    ],
    quota: [
      "quota exceeded",
      "daily quota",
      "已超出配额",
      "配额已用完",
      "每日配额",
    ],
    rateLimited: [
      "too many requests",
      "429",
      "请求过多",
    ],
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalizedText(value) {
    return String(value || "").replace(/\s+/gu, " ").trim().toLowerCase();
  }

  function bodyText() {
    return normalizedText(document.body?.innerText || document.documentElement?.innerText || "");
  }

  function includesAny(text, candidates) {
    return candidates.some((candidate) => text.includes(candidate));
  }

  function visible(node) {
    if (!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function textMatches(node, candidates) {
    const text = normalizedText(node?.textContent || node?.getAttribute?.("aria-label") || "");
    return candidates.some((candidate) => text.includes(candidate));
  }

  function findInspectionInput() {
    const inputs = [...document.querySelectorAll('input:not([type="hidden"])')].filter(visible);
    const ranked = inputs.map((input) => {
      const haystack = normalizedText([
        input.getAttribute("aria-label"),
        input.getAttribute("placeholder"),
        input.getAttribute("role"),
        input.name,
      ].filter(Boolean).join(" "));
      let score = 0;
      if (haystack.includes("inspect")) score += 5;
      if (haystack.includes("url")) score += 4;
      if (haystack.includes("网址")) score += 4;
      if (haystack.includes("search console")) score += 2;
      if (input.getAttribute("role") === "combobox") score += 1;
      return { input, score };
    }).sort((a, b) => b.score - a.score);
    if (ranked[0]?.score > 0) return ranked[0].input;
    return ranked.find(({ input }) => input.type === "text" || input.getAttribute("role") === "combobox")?.input || null;
  }

  function setInputValue(input, value) {
    if (typeof input.select === "function") input.select();
    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, value) === true;
    } catch {}
    if (!inserted || input.value !== value) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      descriptor?.set?.call(input, value);
      input.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value,
      }));
    }
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function pressEnter(input) {
    for (const type of ["keydown", "keypress", "keyup"]) {
      input.dispatchEvent(new KeyboardEvent(type, {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      }));
    }
  }

  async function waitFor(check, timeoutMs, intervalMs = 500) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = check();
      if (value) return value;
      await sleep(intervalMs);
    }
    return null;
  }

  function detectPageState() {
    const text = bodyText();
    if (includesAny(text, TEXT.rateLimited)) return { kind: "rate_limited" };
    if (includesAny(text, TEXT.quota)) return { kind: "quota_blocked" };
    if (includesAny(text, TEXT.notIndexed)) return { kind: "not_indexed" };
    if (includesAny(text, TEXT.indexed)) return { kind: "already_indexed" };
    return null;
  }

  function findRequestIndexingButton() {
    const nodes = [
      ...document.querySelectorAll("button"),
      ...document.querySelectorAll('[role="button"]'),
    ];
    return nodes.find((node) => visible(node) && textMatches(node, TEXT.request) && !node.hasAttribute("disabled")) || null;
  }

  function findSuccessDialogState() {
    const text = bodyText();
    if (includesAny(text, TEXT.rateLimited)) return "rate_limited";
    if (includesAny(text, TEXT.quota)) return "quota_blocked";
    if (includesAny(text, TEXT.requested)) return "requested_indexing";
    return "";
  }

  async function probe() {
    const input = await waitFor(findInspectionInput, 15000, 300);
    return {
      ok: true,
      hostname: location.hostname,
      pathname: location.pathname,
      inspectionInput: Boolean(input),
    };
  }

  async function inspectURL(url) {
    const input = await waitFor(findInspectionInput, 30000, 300);
    if (!input) {
      return { ok: false, action: "ui_changed", error: "Google Search Console URL inspection input was not found" };
    }
    input.click();
    input.focus();
    if (typeof input.select === "function") input.select();
    setInputValue(input, url);
    await sleep(150);
    pressEnter(input);

    const state = await waitFor(detectPageState, 90000, 500);
    if (!state) {
      return { ok: false, action: "timeout", error: "Google Search Console inspection timed out" };
    }
    if (state.kind === "rate_limited") {
      return { ok: false, action: "rate_limited", error: "Google Search Console returned 429 / too many requests" };
    }
    if (state.kind === "quota_blocked") {
      return { ok: false, action: "quota_blocked", error: "Google Search Console quota was exhausted" };
    }
    return { ok: true, action: state.kind, url };
  }

  async function requestIndexing(url) {
    const inspected = await inspectURL(url);
    if (!inspected.ok || inspected.action === "already_indexed") return inspected;

    const button = await waitFor(findRequestIndexingButton, 30000, 500);
    if (!button) {
      return { ok: false, action: "ui_changed", url, error: "Request indexing button was not found" };
    }
    button.click();

    const result = await waitFor(findSuccessDialogState, 180000, 500);
    if (!result) {
      return { ok: false, action: "timeout", url, error: "Google Request Indexing timed out" };
    }
    if (result === "quota_blocked") {
      return { ok: false, action: result, url, error: "Google Request Indexing daily quota was exhausted" };
    }
    if (result === "rate_limited") {
      return { ok: false, action: result, url, error: "Google Search Console rate limited Request Indexing" };
    }
    return { ok: true, action: "requested_indexing", url };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return false;
    let task = null;
    if (message.type === "blogctl.google.index.probe") task = probe();
    if (message.type === "blogctl.google.index.inspect") task = inspectURL(String(message.url || "").trim());
    if (message.type === "blogctl.google.index.request") task = requestIndexing(String(message.url || "").trim());
    if (!task) return false;
    Promise.resolve(task)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, action: "failed", error: error?.message || String(error) }));
    return true;
  });
})();
