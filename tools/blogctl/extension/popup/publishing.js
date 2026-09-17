"use strict";

(function (root) {
  const state = { initialized: false, active: false, platforms: [] };
  let platformSelect, footerEnabled, footerTemplate, trackingQuery, preview, saveButton, resetButton, message;

  function currentPlatform() { return state.platforms.find((platform) => platform.id === platformSelect.value); }
  function defaultsFor(platform) {
    const english = platform === "devto" || platform === "medium";
    return { footerEnabled: true, footerTemplate: english ? "> This article was first published on [{site}]({url}) and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version." : "> 本文首发于 [{site}]({url})，由作者本人同步发布。原文可能持续修订，最新版本请以个人博客为准。", trackingQuery: `utm_source=${platform}&utm_medium=referral&utm_campaign=article_syndication` };
  }
  function trackedUrl(query) {
    const url = new URL("https://thinkerqaq.github.io/articles/example/");
    const params = new URLSearchParams(String(query || "").replace(/^\?/, ""));
    for (const [key, value] of params) if (key) url.searchParams.set(key, value);
    return url.toString();
  }
  function updatePreview() {
    if (!footerEnabled.checked) { preview.textContent = "Footer 已关闭。"; return; }
    const url = trackedUrl(trackingQuery.value.trim());
    preview.textContent = footerTemplate.value.replaceAll("{site}", "ThinkerQAQ 的个人博客").replaceAll("{title}", "示例文章").replaceAll("{url}", url).trim();
  }
  function writeForm(platform) {
    const config = platform || {};
    footerEnabled.checked = Boolean(config.footerEnabled); footerTemplate.value = config.footerTemplate || ""; trackingQuery.value = config.trackingQuery || ""; updatePreview();
  }
  function readForm() {
    const platform = currentPlatform();
    if (!platform) return null;
    return { ...platform, footerEnabled: footerEnabled.checked, footerTemplate: footerTemplate.value.trim(), trackingQuery: trackingQuery.value.trim() };
  }
  function renderPlatformSelect() {
    const previous = platformSelect.value;
    platformSelect.replaceChildren();
    for (const platform of state.platforms) { const option = document.createElement("option"); option.value = platform.id; option.textContent = platform.label || platform.id; platformSelect.append(option); }
    if (state.platforms.some((platform) => platform.id === previous)) platformSelect.value = previous;
    if (!platformSelect.value && state.platforms.length) platformSelect.value = state.platforms[0].id;
    writeForm(currentPlatform());
  }
  async function save() {
    const current = readForm(); if (!current) return;
    if (current.footerEnabled && !current.footerTemplate) { BlogCTLPopup.setMessage(message, "启用 Footer 时模板不能为空。", "error"); return; }
    saveButton.disabled = true; BlogCTLPopup.setMessage(message, "正在保存发布配置…");
    try {
      const response = await BlogCTLPopup.send("blogctl.publishing.save", { platforms: [current] });
      state.platforms = response.platforms ?? []; renderPlatformSelect(); platformSelect.value = current.id; writeForm(currentPlatform());
      BlogCTLPopup.setMessage(message, `${current.label || current.id} 发布配置已保存。`, "ok");
    } catch (error) { BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error"); }
    finally { saveButton.disabled = false; }
  }
  function reset() {
    const platform = currentPlatform(); if (!platform) return;
    writeForm({ ...platform, ...defaultsFor(platform.id) });
    BlogCTLPopup.setMessage(message, "已恢复默认值；点击“保存”后写入本机配置。");
  }
  async function refresh() {
    if (!state.active) return; BlogCTLPopup.setMessage(message);
    try { const response = await BlogCTLPopup.send("blogctl.publishing"); state.platforms = response.platforms ?? []; renderPlatformSelect(); await BlogCTLPopup.refreshBridgeIndicator(); }
    catch (error) { BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error"); }
  }
  function init() {
    if (state.initialized) return;
    platformSelect = document.getElementById("publishingPlatform"); footerEnabled = document.getElementById("footerEnabled"); footerTemplate = document.getElementById("footerTemplate"); trackingQuery = document.getElementById("trackingQuery"); preview = document.getElementById("publishingPreview"); saveButton = document.getElementById("savePublishing"); resetButton = document.getElementById("resetPublishing"); message = document.getElementById("publishingMessage");
    platformSelect.addEventListener("change", () => writeForm(currentPlatform())); footerEnabled.addEventListener("change", updatePreview); footerTemplate.addEventListener("input", updatePreview); trackingQuery.addEventListener("input", updatePreview); saveButton.addEventListener("click", save); resetButton.addEventListener("click", reset); state.initialized = true;
  }
  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLPublishing = { init, activate, deactivate, refresh };
})(globalThis);
