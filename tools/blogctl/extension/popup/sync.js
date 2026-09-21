"use strict";

(function (root) {
  const NATIVE_BROWSER_PLATFORMS = new Set([
    "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao",
  ]);
  const state = { initialized: false, active: false, articles: [], status: null, publishing: [], tools: [], cnblogsBinding: null, bindingLoading: false, bindingError: false, matches: {}, matchKey: "", refreshSerial: 0 };
  let articleFilter, articleSelect, articleMeta, platformsContainer, startButton, message;
  let refreshMatchesButton;

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
    const published = selectedPlatforms().includes("cnblogs") && state.cnblogsBinding?.state === "published";
    startButton.disabled = !ready || published || (selectedPlatforms().includes("cnblogs") && (state.bindingLoading || state.bindingError));
    refreshMatchesButton.disabled = !ready;
    startButton.textContent = published ? "博客园已发布文章请到“发布配置”更新"
      : ready ? `创建/更新 ${count} 个平台草稿` : "选择文章和平台后创建草稿";
  }

  function renderArticleMeta() {
    const article = state.articles.find((item) => item.slug === articleSelect.value);
    articleMeta.textContent = article ? `${article.title} · ${article.slug} · ${article.status || "published"}` : "";
  }

  function renderArticles() {
    const previous = articleSelect.value || localStorage.getItem("blogctl.selectedArticle") || "";
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
    const currentKey = matchSelectionKey();
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
      checkbox.addEventListener("change", () => { clearMatches(); updateStartButton(); });
      const text = document.createElement("span");
      text.className = "platform-choice-text";
      const name = document.createElement("strong");
      name.textContent = platform.label || platform.id;
      const detail = document.createElement("small");
      const nativeBrowserPlatform = NATIVE_BROWSER_PLATFORMS.has(platform.id);
      const apiPlatform = platform.id === "devto";
      detail.textContent = platform.id === "cnblogs" && state.cnblogsBinding?.state === "published"
        ? "已绑定已发布文章；到“发布配置”更新"
        : !availability.available
        ? availability.reason
        : apiPlatform
          ? "API Key 已配置"
          : platform.loggedIn
          ? (platform.inferred ? "浏览器会话可用 · 执行时校验登录" : "已登录")
          : nativeBrowserPlatform
            ? "登录状态将在任务启动时校验"
            : platform.known === false
              ? `登录状态检测失败${platform.error ? ` · ${platform.error}` : ""}`
              : "未登录";
      text.append(name, detail);
      const status = document.createElement("span");
      if (!availability.available) BlogCTLPopup.setStatus(status, "disabled", availability.reason);
      else if (apiPlatform) BlogCTLPopup.setStatus(status, "ok", "可用");
      else if (platform.loggedIn) BlogCTLPopup.setStatus(status, "ok", platform.inferred ? "会话可用" : "已登录");
      else if (nativeBrowserPlatform) BlogCTLPopup.setStatus(status, "unknown", "待校验");
      else if (platform.known === false) BlogCTLPopup.setStatus(status, "unknown", "未知");
      else BlogCTLPopup.setStatus(status, "error", "未登录");
      label.append(checkbox, text, status);
      const card = document.createElement("div");
      card.className = "platform-choice-card";
      card.append(label);
      const match = state.matches[platform.id];
      if (match && state.matchKey === currentKey) {
        const result = document.createElement("div");
        result.className = "article-match";
        result.textContent = match.text;
        for (const item of match.items ?? []) {
          const row = document.createElement("div");
          row.textContent = `${item.bound ? "已绑定 · " : "候选 · "}${item.title} · ${item.published ? "已发布" : "草稿"} · ID ${item.id}`;
          if (item.url && /^https:\/\/(?:www\.cnblogs\.com|dev\.to)\//.test(item.url)) {
            const link = document.createElement("a");
            link.textContent = "查看文章";
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            row.append(" · ", link);
          }
          result.append(row);
        }
        card.append(result);
      }
      platformsContainer.append(card);
    }
    if (!platformsContainer.childElementCount) platformsContainer.innerHTML = '<div class="platform-loading">没有可用平台</div>';
    updateStartButton();
  }

  function matchSelectionKey() {
    return JSON.stringify([articleSelect.value, selectedPlatforms().sort()]);
  }

  function clearMatches() {
    state.matches = {};
    state.matchKey = "";
    state.refreshSerial++;
    platformsContainer.querySelectorAll(".article-match").forEach((element) => element.remove());
  }

  async function refreshArticleMatches() {
    const article = articleSelect.value;
    const platforms = selectedPlatforms();
    if (!article || !platforms.length) return;
    const key = matchSelectionKey();
    const serial = ++state.refreshSerial;
    state.matchKey = key;
    state.matches = Object.fromEntries(platforms.map((platform) => [platform, { text: "正在检测文章关联…" }]));
    renderPlatforms();
    refreshMatchesButton.disabled = true;
    const results = await Promise.all(platforms.map(async (platform) => {
      try {
        const response = await BlogCTLPopup.send("blogctl.article.match", { article, platform });
        return [platform, response.match];
      } catch (error) {
        return [platform, { text: `检测失败：${BlogCTLPopup.errorMessage(error)}` }];
      }
    }));
    if (serial !== state.refreshSerial || key !== matchSelectionKey()) return;
    state.matches = Object.fromEntries(results);
    renderPlatforms();
  }

  async function startSync() {
    const article = articleSelect.value;
    const platforms = selectedPlatforms();
    if (!article || !platforms.length) return;
    startButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在创建同步任务…");
    try {
      const response = await BlogCTLPopup.send("blogctl.job.start", {
        request: { article, platforms, dryRun: false, usePlatformChangedOnly: true, draft: true, operation: "draft" },
      });
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
      if (articleSelect.value) loadSyncBinding();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      updateStartButton();
    }
  }

  async function loadSyncBinding() {
    const article = articleSelect.value;
    state.cnblogsBinding = null;
    state.bindingError = false;
    state.bindingLoading = Boolean(article);
    updateStartButton();
    if (!article) return;
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.binding", { article });
      if (article !== articleSelect.value) return;
      state.cnblogsBinding = response.found ? response.binding : null;
    } catch (error) {
      state.bindingError = true;
      BlogCTLPopup.setMessage(message, `读取博客园绑定失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    } finally {
      if (article === articleSelect.value) {
        state.bindingLoading = false;
        renderPlatforms();
      }
    }
  }

  function init() {
    if (state.initialized) return;
    articleFilter = document.getElementById("articleFilter"); articleSelect = document.getElementById("articleSelect"); articleMeta = document.getElementById("articleMeta"); platformsContainer = document.getElementById("syncPlatforms"); startButton = document.getElementById("startSync"); message = document.getElementById("syncMessage"); refreshMatchesButton = document.getElementById("refreshArticleMatches");
    articleFilter.addEventListener("input", () => {
      const previous = articleSelect.value;
      renderArticles(); renderPlatforms();
      if (previous !== articleSelect.value) { clearMatches(); loadSyncBinding(); }
    });
    articleSelect.addEventListener("change", () => { localStorage.setItem("blogctl.selectedArticle", articleSelect.value); clearMatches(); renderArticleMeta(); renderPlatforms(); loadSyncBinding(); });
    startButton.addEventListener("click", startSync);
    refreshMatchesButton.addEventListener("click", refreshArticleMatches);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLSync = { init, activate, deactivate, refresh };
})(globalThis);
