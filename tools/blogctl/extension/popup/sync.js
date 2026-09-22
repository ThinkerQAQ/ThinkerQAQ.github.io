"use strict";

(function (root) {
  const state = { initialized: false, active: false, articles: [], selectedSlug: "", selectedPlatformIDs: new Set(BlogCTLSyncState.loadPlatforms(localStorage)), status: null, publishing: [], tools: [], cnblogsBindings: [], bindingLoading: false, bindingError: false, matches: {}, matchKey: "", cachedMatchTime: 0, refreshSerial: 0 };
  let articlePicker, articleOptions, articleMeta, platformsContainer, startButton, updatePublishedButton, message;
  let refreshMatchesButton;

  function selectedPlatforms() {
    return [...platformsContainer.querySelectorAll('input[type="checkbox"][data-platform]:checked')]
      .filter((input) => !input.disabled)
      .map((input) => input.dataset.platform);
  }

  function selectedArticle() {
    return state.articles.find((item) => item.slug === state.selectedSlug);
  }

  function publishingProfile(platformId) {
    return state.publishing.find((item) => item.id === platformId) ?? {};
  }

  function updateStartButton() {
    const count = selectedPlatforms().length;
    const ready = Boolean(state.selectedSlug) && count > 0 && Boolean(state.status?.bridge?.running);
    startButton.disabled = !ready || (selectedPlatforms().includes("cnblogs") && (state.bindingLoading || state.bindingError));
    refreshMatchesButton.disabled = !state.selectedSlug || !state.status?.bridge?.running;
    startButton.textContent = ready ? `创建／更新 ${count} 个平台草稿` : "选择文章和平台后创建草稿";
    const selected = selectedPlatforms();
    updatePublishedButton.disabled = !BlogCTLSyncModel.canUpdatePublished(
      state.selectedSlug, selected, state.status?.bridge?.running, state.status,
    );
    const selectedStatus = (state.status?.platforms ?? []).find((platform) => platform.id === selected[0]);
    updatePublishedButton.title = selected.length === 1 && selectedStatus?.capabilities?.publishedUpdate
      ? "更新前会由 Bridge 校验已发布文章绑定和远端状态"
      : "所选平台暂不支持安全更新已发布文章";
  }

  function renderArticleMeta() {
    const article = selectedArticle();
    articleMeta.textContent = article ? `${article.title} · ${article.slug} · ${article.status || "published"}` : "";
  }

  function renderArticles() {
    const query = articlePicker.value.trim().toLowerCase();
    const filtered = state.articles.filter((article) => !query || `${article.title} · ${article.slug}`.toLowerCase().includes(query));
    articleOptions.replaceChildren();
    for (const article of filtered) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "article-option";
      option.setAttribute("role", "option");
      option.textContent = `${article.title} · ${article.slug}`;
      option.addEventListener("click", () => selectArticle(article));
      articleOptions.append(option);
    }
    if (!filtered.length) articleOptions.textContent = "没有匹配文章";
    articlePicker.setAttribute("aria-expanded", String(!articleOptions.hidden));
    renderArticleMeta();
    updateStartButton();
  }

  function selectArticle(article) {
    state.selectedSlug = article.slug;
    articlePicker.value = `${article.title} · ${article.slug}`;
    articleOptions.hidden = true;
    articlePicker.setAttribute("aria-expanded", "false");
    localStorage.setItem("blogctl.selectedArticle", article.slug);
    clearMatches(); renderArticleMeta(); renderPlatforms(); loadSyncBinding();
  }

  function renderPlatforms() {
    const previous = platformsContainer.querySelector('input[data-platform]') ? new Set(selectedPlatforms()) : state.selectedPlatformIDs;
    const currentKey = matchSelectionKey();
    const article = selectedArticle();
    platformsContainer.replaceChildren();
    for (const platform of state.status?.platforms ?? []) {
      const sourceAvailability = BlogCTLSyncModel.platformAvailability(article, platform, publishingProfile(platform.id));
      const toolAvailability = BlogCTLSyncModel.deliveryToolAvailability(platform, state.tools);
      const availability = sourceAvailability.available ? toolAvailability : sourceAvailability;
      const label = document.createElement("label");
      label.className = "platform-choice";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.platform = platform.id;
      checkbox.checked = previous.has(platform.id) && availability.available;
      checkbox.disabled = !availability.available;
      checkbox.addEventListener("change", () => {
        state.selectedPlatformIDs = new Set(selectedPlatforms());
        BlogCTLSyncState.savePlatforms(localStorage, state.selectedPlatformIDs);
        updateStartButton();
      });
      const text = document.createElement("span");
      text.className = "platform-choice-text";
      const name = document.createElement("strong");
      name.textContent = platform.label || platform.id;
      const detail = document.createElement("small");
      const nativeBrowserPlatform = platform.capabilities?.browserSession === true;
      const apiPlatform = platform.capabilities?.apiKey === true;
      detail.textContent = !availability.available
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
        result.textContent = state.cachedMatchTime ? `上次刷新 ${new Date(state.cachedMatchTime).toLocaleString()} · ${match.text}` : match.text;
        for (const item of match.items ?? []) {
          const row = document.createElement("div");
          row.className = "article-match-row";
          row.textContent = `${item.localOnly ? "本地记录 · " : item.bound ? "已绑定 · " : "候选 · "}${item.title} · ${item.published ? "已发布" : "草稿"} · ID ${item.id}${item.bound && item.bindingState && item.bindingState !== (item.published ? "published" : "draft") ? " · 远端状态已变化" : ""}`;
          if (item.url && /^https:\/\/(?:www\.cnblogs\.com|i\.cnblogs\.com|dev\.to)\//.test(item.url)) {
            const link = document.createElement("a");
            link.textContent = "查看文章";
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            row.append(" · ", link);
          }
          if (platform.id === "cnblogs") {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "secondary";
            const stateChanged = item.bound && item.bindingState !== (item.published ? "published" : "draft");
            button.textContent = stateChanged ? "更新绑定状态" : item.bound ? "解除绑定" : "验证并绑定";
            button.disabled = Boolean(item.unverified && stateChanged);
            button.addEventListener("click", () => changeBinding(item, button));
            row.append(button);
          }
          result.append(row);
        }
        if (platform.id === "cnblogs") {
          const manual = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = "候选中没有？输入文章 ID／链接";
          const input = document.createElement("input");
          input.type = "text";
          input.placeholder = "博客园文章 ID 或链接";
          input.autocomplete = "off";
          const bind = document.createElement("button");
          bind.type = "button";
          bind.className = "secondary";
          bind.textContent = "验证并绑定";
          bind.addEventListener("click", async () => {
            const reference = input.value.trim();
            if (!reference) return;
            const article = state.selectedSlug;
            bind.disabled = true;
            try {
              const existing = state.cnblogsBindings.length > 0;
              if (existing && !confirm("将验证该远端文章；若对应状态已有绑定，会替换原绑定。继续吗？")) return;
              await BlogCTLPopup.send("blogctl.cnblogs.bind", { article, reference, replace: existing });
              if (article !== state.selectedSlug) return;
              await loadSyncBinding(); await refreshArticleMatches();
              BlogCTLPopup.setMessage(message, "绑定已保存。", "ok");
            } catch (error) { BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error"); }
            finally { bind.disabled = false; }
          });
          manual.append(summary, input, bind);
          result.append(manual);
        }
        card.append(result);
      }
      platformsContainer.append(card);
    }
    if (!platformsContainer.childElementCount) platformsContainer.innerHTML = '<div class="platform-loading">没有可用平台</div>';
    updateStartButton();
  }

  function matchSelectionKey() {
    return state.selectedSlug;
  }

  function clearMatches() {
    state.matches = {};
    state.matchKey = "";
    state.cachedMatchTime = 0;
    BlogCTLSyncState.clearMatches(localStorage);
    state.refreshSerial++;
    platformsContainer.querySelectorAll(".article-match").forEach((element) => element.remove());
  }

  async function refreshArticleMatches() {
    const article = state.selectedSlug;
    const platforms = (state.status?.platforms ?? []).map((platform) => platform.id);
    if (!article || !platforms.length) return;
    const started = performance.now();
    const key = matchSelectionKey();
    const serial = ++state.refreshSerial;
    state.matchKey = key;
    state.cachedMatchTime = 0;
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
    BlogCTLSyncState.saveMatches(localStorage, article, state.matches);
    console.info("BlogCTL article matches refreshed", { platformCount: platforms.length, resultCount: results.filter(([, match]) => (match.items ?? []).length > 0).length, durationMs: Math.round(performance.now() - started) });
    renderPlatforms();
  }

  async function changeBinding(item, button) {
    const article = state.selectedSlug;
    const stateName = item.published ? "published" : "draft";
    const stateChanged = item.bound && item.bindingState !== stateName;
    if (item.bound && !stateChanged && !confirm(`只解除本地${item.published ? "已发布文章" : "草稿"}绑定，远端文章不会删除。继续吗？`)) return;
    const existing = state.cnblogsBindings.find((binding) => binding.state === stateName);
    if ((!item.bound || stateChanged) && existing && existing.postId !== item.id && !confirm(`将替换当前${item.published ? "已发布文章" : "草稿"}绑定。继续吗？`)) return;
    button.disabled = true;
    BlogCTLPopup.setMessage(message, item.bound && !stateChanged ? "正在解除本地绑定…" : "正在验证远端文章并绑定…");
    try {
      await BlogCTLPopup.send(item.bound && !stateChanged ? "blogctl.cnblogs.unbind" : "blogctl.cnblogs.bind", {
        article, state: item.bound && !stateChanged ? item.bindingState : stateName, postId: item.id, reference: item.id, replace: Boolean(existing),
      });
      if (article !== state.selectedSlug) return;
      await loadSyncBinding();
      await refreshArticleMatches();
      BlogCTLPopup.setMessage(message, item.bound && !stateChanged ? "本地绑定已解除。" : "绑定已保存。", "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally { button.disabled = false; }
  }

  async function startSync() {
    const article = state.selectedSlug;
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
      const previous = state.selectedSlug || localStorage.getItem("blogctl.selectedArticle") || "";
      if (state.articles.some((item) => item.slug === previous)) {
        state.selectedSlug = previous;
        const selected = selectedArticle();
        articlePicker.value = `${selected.title} · ${selected.slug}`;
      } else { state.selectedSlug = ""; }
      if (state.selectedSlug && state.matchKey !== state.selectedSlug) {
        const cached = BlogCTLSyncState.loadMatches(localStorage, state.selectedSlug);
        if (cached) {
          state.matches = cached.matches;
          state.matchKey = state.selectedSlug;
          state.cachedMatchTime = cached.savedAt;
          console.info("BlogCTL article matches restored", { platformCount: Object.keys(cached.matches).length, ageMs: Date.now() - cached.savedAt });
        }
      }
      renderArticles(); renderPlatforms();
      if (state.selectedSlug) loadSyncBinding();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      updateStartButton();
    }
  }

  async function loadSyncBinding() {
    const article = state.selectedSlug;
    state.cnblogsBindings = [];
    state.bindingError = false;
    state.bindingLoading = Boolean(article);
    updateStartButton();
    if (!article) return;
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.binding", { article });
      if (article !== state.selectedSlug) return;
      state.cnblogsBindings = response.bindings ?? (response.found ? [response.binding] : []);
    } catch (error) {
      state.bindingError = true;
      BlogCTLPopup.setMessage(message, `读取博客园绑定失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    } finally {
      if (article === state.selectedSlug) {
        state.bindingLoading = false;
        renderPlatforms();
      }
    }
  }

  async function updatePublished() {
    if (updatePublishedButton.disabled || !state.selectedSlug) return;
    if (!confirm("将本地内容更新到已绑定的博客园已发布文章。继续吗？")) return;
    const article = state.selectedSlug;
    const started = performance.now();
    updatePublishedButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在启动已发布文章更新任务…");
    try {
      console.info("BlogCTL published update requested", { platform: "cnblogs", article });
      const response = await BlogCTLPopup.send("blogctl.cnblogs.update", { article });
      console.info("BlogCTL published update started", { platform: "cnblogs", article, jobId: response.job?.id || "", durationMs: Math.round(performance.now() - started) });
      BlogCTLPopup.setMessage(message, `任务 ${response.job?.id || ""} 已启动，可在“任务”页查看进度。`, "ok");
    } catch (error) {
      console.warn("BlogCTL published update rejected", { platform: "cnblogs", article, code: error.code || "", status: error.status || 0, durationMs: Math.round(performance.now() - started) });
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally { updateStartButton(); }
  }

  function init() {
    if (state.initialized) return;
    articlePicker = document.getElementById("articlePicker"); articleOptions = document.getElementById("articleOptions"); articleMeta = document.getElementById("articleMeta"); platformsContainer = document.getElementById("syncPlatforms"); startButton = document.getElementById("startSync"); updatePublishedButton = document.getElementById("updatePublished"); message = document.getElementById("syncMessage"); refreshMatchesButton = document.getElementById("refreshArticleMatches");
    articlePicker.addEventListener("focus", () => { articleOptions.hidden = false; renderArticles(); });
    articlePicker.addEventListener("input", () => {
      state.selectedSlug = "";
      clearMatches(); loadSyncBinding(); renderPlatforms();
      articleOptions.hidden = false; renderArticles();
    });
    articlePicker.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { articleOptions.hidden = true; articlePicker.setAttribute("aria-expanded", "false"); }
      if (event.key === "Enter" && !articleOptions.hidden && articleOptions.querySelector("button")) {
        event.preventDefault(); articleOptions.querySelector("button").click();
      }
    });
    document.addEventListener("click", (event) => {
      if (event.target !== articlePicker && !articleOptions.contains(event.target)) { articleOptions.hidden = true; articlePicker.setAttribute("aria-expanded", "false"); }
    });
    startButton.addEventListener("click", startSync);
    updatePublishedButton.addEventListener("click", updatePublished);
    refreshMatchesButton.addEventListener("click", refreshArticleMatches);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLSync = { init, activate, deactivate, refresh };
})(globalThis);
