"use strict";

// Shared localized presentation for the Extension and Web Console. All strings
// come from bundled catalogs; original user content and technical logs remain
// unchanged. The DOM binding also covers feature modules that render on demand.
(function (root) {
  const SUPPORTED = new Set(["auto", "zh-CN", "en"]);
  const catalog = root.BlogCTLEnMessages;
  if (!root.i18next || !catalog) throw new Error("BlogCTL translation assets are missing");

  const engine = root.i18next.createInstance();
  engine.init({
    initImmediate: false, lng: "zh-CN", fallbackLng: "zh-CN",
    keySeparator: false, nsSeparator: false,
    interpolation: { escapeValue: false },
    resources: { "zh-CN": { translation: {} }, en: { translation: catalog } },
  });

  let preference = "auto";
  let effective = "zh-CN";
  let observer;
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const attributes = ["title", "placeholder", "aria-label", "data-tooltip"];
  const avoid = "script,style,pre,code,textarea,.cm-editor,.log-viewer,.log-entry,[data-i18n-ignore]";
  const patterns = [
    [/^匹配 (\d+) 个设置分类；打开分类后可直接编辑原有配置。$/, (_, count) =>
      `Found ${count} settings categories. Open a category to edit its settings.`],
    [/^已清理 (\d+) 个任务。$/, (_, count) => `Cleared ${count} tasks.`],
    [/^共 (\d+) 篇远端文章 · 当前显示 (\d+) 篇$/, (_, count, visible) =>
      `${count} remote articles · ${visible} shown`],
    [/^(\d+) \/ (\d+) 可用$/, (_, available, total) => `${available} of ${total} available`],
    [/^版本 v(.+)$/, (_, version) => `Version v${version}`],
    [/^已选择：(.*)$/, (_, value) => `Selected: ${value}`],
    [/^任务读取失败：(.*)$/, (_, value) => `Failed to load tasks: ${value}`],
    [/^检测失败：(.*)$/, (_, value) => `Detection failed: ${value}`],
    [/^远端检查失败：(.*)$/, (_, value) => `Remote check failed: ${value}`],
    [/^正在保存 (.+)…$/, (_, value) => `Saving ${value}…`],
    [/^(.+) 已保存并重新检测。$/, (_, value) => `${value} saved and rechecked.`],
    [/^正在执行 (.+)：(.+)…$/, (_, tool, action) => `Running ${tool}: ${action}…`],
    [/^(.+) 平台配置已保存。$/, (_, value) => `${value} platform settings saved.`],
    [/^已加入任务 (.+)$/, (_, id) => `Task ${id} queued`],
  ];

  function systemLocale() {
    const language = String(root.navigator?.languages?.[0] || root.navigator?.language || "zh-CN");
    return language.toLowerCase().startsWith("en") ? "en" : "zh-CN";
  }
  function resolvedLocale(value) {
    return value === "auto" ? systemLocale() : value;
  }
  function t(source) {
    if (effective !== "en" || typeof source !== "string") return source;
    const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(source);
    if (!match) return source;
    const [, prefix, phrase, suffix] = match;
    if (!phrase) return source;
    if (Object.hasOwn(catalog, phrase)) return prefix + engine.t(phrase) + suffix;
    for (const [pattern, format] of patterns) {
      const parts = pattern.exec(phrase);
      if (parts) return prefix + format(...parts) + suffix;
    }
    return source;
  }
  function shouldIgnore(element) {
    return Boolean(element?.closest?.(avoid));
  }
  function translateText(node) {
    if (!node || node.nodeType !== 3 || shouldIgnore(node.parentElement)) return;
    const current = node.nodeValue || "";
    const cached = originalText.get(node);
    const source = cached && cached.translated === current ? cached.source : current;
    const translated = t(source);
    originalText.set(node, { source, translated });
    if (translated !== current) node.nodeValue = translated;
  }
  function translateAttributes(element) {
    if (shouldIgnore(element)) return;
    let cached = originalAttributes.get(element);
    if (!cached) { cached = new Map(); originalAttributes.set(element, cached); }
    for (const name of attributes) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name) ?? "";
      const prior = cached.get(name);
      const source = prior && prior.translated === current ? prior.source : current;
      const translated = t(source);
      cached.set(name, { source, translated });
      if (translated !== current) element.setAttribute(name, translated);
    }
  }
  function localizeNode(node) {
    if (!node) return;
    if (node.nodeType === 3) return translateText(node);
    if (node.nodeType !== 1 || shouldIgnore(node)) return;
    translateAttributes(node);
    const iter = node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (iter.nextNode()) translateText(iter.currentNode);
    for (const element of node.querySelectorAll("*")) translateAttributes(element);
  }
  function applyLocale() {
    const locale = resolvedLocale(preference);
    effective = locale;
    engine.changeLanguage(locale);
    document.documentElement.lang = locale;
    localizeNode(document.body);
    const select = document.getElementById("blogctlUiLocale");
    if (select) select.value = preference;
    root.dispatchEvent(new CustomEvent("blogctl:locale-changed", { detail: { locale, preference } }));
  }
  async function saveLocale(value) {
    if (!SUPPORTED.has(value)) throw new Error("invalid UI locale");
    const previous = preference;
    preference = value;
    applyLocale();
    try {
      await root.BlogCTLTransport.send("blogctl.locale.set", { uiLocale: value });
    } catch (error) {
      preference = previous;
      applyLocale();
      throw error;
    }
  }
  async function reloadLocale() {
    try {
      const response = await root.BlogCTLTransport.send("blogctl.locale.get");
      if (SUPPORTED.has(response.uiLocale) && response.uiLocale !== preference) {
        preference = response.uiLocale;
        applyLocale();
      }
    } catch {
      // Keep the browser-language fallback while the Bridge is unavailable.
    }
  }
  function initialize() {
    if (observer) return;
    const label = document.createElement("label");
    label.className = "ui-language-selector";
    label.setAttribute("aria-label", "Interface language");
    const select = document.createElement("select");
    select.id = "blogctlUiLocale";
    select.setAttribute("aria-label", "Interface language");
    for (const [value, caption] of [["auto", "Auto"], ["zh-CN", "中文"], ["en", "EN"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = caption;
      select.append(option);
    }
    select.addEventListener("change", async () => {
      select.disabled = true;
      try { await saveLocale(select.value); }
      catch (error) { console.warn("[BlogCTL i18n] language preference was not saved:", error); }
      finally { select.disabled = false; }
    });
    label.append(select);
    document.querySelector(".header-actions")?.prepend(label);
    applyLocale();
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateText(mutation.target);
        else if (mutation.type === "attributes") translateAttributes(mutation.target);
        else for (const node of mutation.addedNodes) localizeNode(node);
      }
    });
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: attributes,
    });
    reloadLocale();
    root.addEventListener("focus", reloadLocale);
  }
  root.BlogCTLI18n = Object.freeze({
    t, systemLocale, get locale() { return effective; },
    get preference() { return preference; }, setLocale: saveLocale, reloadLocale,
    formatDate: (value, options) => new Intl.DateTimeFormat(effective, options).format(new Date(value)),
    formatNumber: (value) => new Intl.NumberFormat(effective).format(value),
    initialize,
  });
  document.addEventListener("DOMContentLoaded", initialize);
})(globalThis);
