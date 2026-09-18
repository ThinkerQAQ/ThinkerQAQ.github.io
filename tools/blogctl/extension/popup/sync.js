"use strict";

(function (root) {
  const state = { initialized: false, active: false, articles: [], status: null, publishing: [], tools: [] };
  let articleFilter, articleSelect, articleMeta, platformsContainer, changedOnly, startButton, message;

  function selectedPlatforms() {
    return [...platformsContainer.querySelectorAll('input[type="checkbox"][data-platform]:checked')]
      .filter((input) => !input.disabled)
      .map((input) => input.dataset.platform);
  }

  function selectedArticle() {
    return state.articles.find((item) => item.slug === articleSelect.value);
  }

  function publishingProfile(platformId) {
    return state.publishing.find((item) => item.id === platformId) ?? {};
  }

  function updateStartButton() {
    const count = selectedPlatforms().length;
    const ready = Boolean(articleSelect.value) && count > 0 && Boolean(state.status?.bridge?.running);
    startButton.disabled = !ready;
    startButton.textContent = ready ? `创建/更新 ${count} 个平台草稿` : "选择文章和平台后创建草稿";
  }

  function renderArticleMeta() {
    const article = state.articles.find((item) => item.slug === articleSelect.value);
    articleMeta.textContent = article ? `${article.title} · ${article.slug} · ${article.status || "published"}` : "";
  }

  function renderArticles() {
    const previous = articleSelect.value;
    const query = articleFilter.value.trim().toLowerCase();
    const filtered = state.articles.filter((article) => !query || String(article.title || "").toLowerCase().includes(query) || String(article.slug || "").toLowerCase().includes(query));
    articleSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = filtered.length ? `选择文章（${filtered.length}）` : "没有匹配文章";
    articleSelect.append(placeholder);
    for (const article of filtered) {
      const option = document.createElement("option");
      option.value = article.slug;
      option.textContent = `${article.title} · ${article.slug}`;
      articleSelect.append(option);
    }
    if (filtered.some((item) => item.slug === previous)) articleSelect.value = previous;
    renderArticleMeta();
    updateStartButton();
  }

  function renderPlatforms() {
    const previous = new Set(selectedPlatforms());
    const article = selectedArticle();
    platformsContainer.replaceChildren();
    for (const platform of state.status?.platforms ?? []) {
      const sourceAvailability = BlogCTLSyncModel.platformAvailability(article, platform, publishingProfile(platform.id));
      const toolAvailability = BlogCTLSyncModel.deliveryToolAvailability(platform.id, state.tools);
      const availability = sourceAvailability.available ? toolAvailability : sourceAvailability;
      const label = document.createElement("label");
      label.className = "platform-choice";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.platform = platform.id;
      checkbox.checked = previous.has(platform.id) && availability.available;
      checkbox.disabled = !availability.available;
      checkbox.addEventListener("change", updateStartButton);
      const text = document.createElement("span");
      text.className = "platform-choice-text";
      const name = document.createElement("strong");
      name.textContent = platform.label || platform.id;
      const detail = document.createElement("small");
      detail.textContent = !availability.available
        ? availability.reason
        : platform.known === false ? `登录状态检测失败${platform.error ? ` · ${platform.error}` : ""}` : platform.loggedIn ? "已登录" : "未登录";
      text.append(name, detail);
      const status = document.createElement("span");
      if (!availability.available) BlogCTLPopup.setStatus(status, "disabled", availability.reason);
      else if (platform.known === false) BlogCTLPopup.setStatus(status, "unknown", "未知");
      else if (platform.loggedIn) BlogCTLPopup.setStatus(status, "ok", "已登录");
      else BlogCTLPopup.setStatus(status, "error", "未登录");
      label.append(checkbox, text, status);
      platformsContainer.append(label);
    }
    if (!platformsContainer.childElementCount) platformsContainer.innerHTML = '<div class="platform-loading">没有可用平台</div>';
    updateStartButton();
  }

  const BROWSER_SESSION_PLATFORMS = new Set(["juejin", "medium"]);

  async function ensureBrowserSessions(platforms) {
    for (const platformId of platforms) {
      if (!BROWSER_SESSION_PLATFORMS.has(platformId)) continue;
      const platform = (state.status?.platforms ?? []).find((item) => item.id === platformId);
      if (!platform?.loggedIn) {
        throw new Error(`${platform?.label || platformId} 尚未登录，请先在浏览器登录。`);
      }
      BlogCTLPopup.setMessage(message, `正在准备 ${platform.label || platformId} 登录状态…`);
      const response = await BlogCTLPopup.send("blogctl.session.sync", { platform: platformId });
      state.status = response.status;
    }
    BlogCTLPopup.refreshBridgeIndicator(state.status).catch(() => {});
    renderPlatforms();
  }

  async function startSync() {
    const article = articleSelect.value;
    const platforms = selectedPlatforms();
    if (!article || !platforms.length) return;
    startButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在创建同步任务…");
    try {
      await ensureBrowserSessions(platforms);
      const response = await BlogCTLPopup.send("blogctl.job.start", { request: { article, platforms, dryRun: false, changed: changedOnly.checked, draft: true } });
      BlogCTLPopup.setMessage(message, `任务 ${response.job?.id || ""} 已启动，可在“任务”页查看进度。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      updateStartButton();
    }
  }

  async function refresh() {
    if (!state.active) return;
    BlogCTLPopup.setMessage(message);
    try {
      const [articlesResponse, statusResponse, publishingResponse, toolsResponse] = await Promise.all([
        BlogCTLPopup.send("blogctl.articles"),
        BlogCTLPopup.send("blogctl.status"),
        BlogCTLPopup.send("blogctl.publishing"),
        BlogCTLPopup.send("blogctl.tools"),
      ]);
      state.articles = articlesResponse.articles ?? [];
      state.status = statusResponse.status;
      state.publishing = publishingResponse.platforms ?? [];
      state.tools = toolsResponse.tools ?? [];
      BlogCTLPopup.refreshBridgeIndicator(state.status).catch(() => {});
      renderArticles(); renderPlatforms();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      updateStartButton();
    }
  }

  function init() {
    if (state.initialized) return;
    articleFilter = document.getElementById("articleFilter"); articleSelect = document.getElementById("articleSelect"); articleMeta = document.getElementById("articleMeta"); platformsContainer = document.getElementById("syncPlatforms"); changedOnly = document.getElementById("changedOnly"); startButton = document.getElementById("startSync"); message = document.getElementById("syncMessage");
    articleFilter.addEventListener("input", () => { renderArticles(); renderPlatforms(); });
    articleSelect.addEventListener("change", () => { renderArticleMeta(); renderPlatforms(); });
    startButton.addEventListener("click", startSync);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLSync = { init, activate, deactivate, refresh };
})(globalThis);
