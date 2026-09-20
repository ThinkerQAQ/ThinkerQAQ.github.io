"use strict";

(function (root) {
  const NATIVE_BROWSER_PLATFORMS = new Set([
    "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao",
  ]);
  const state = { initialized: false, active: false, articles: [], status: null, publishing: [], tools: [], cnblogsBinding: null };
  let articleFilter, articleSelect, articleMeta, platformsContainer, changedOnly, startButton, message;
  let bindingStatus, bindingMessage, findButton, candidatesSelect, referenceInput, bindButton, updatePublishedButton;

  function renderBinding() {
    const selected = Boolean(articleSelect.value);
    findButton.disabled = !selected;
    bindButton.disabled = !selected;
    updatePublishedButton.disabled = !selected || state.cnblogsBinding?.state !== "published";
    const binding = state.cnblogsBinding;
    bindingStatus.textContent = !selected ? "选择文章后查看绑定。"
      : !binding ? "尚未绑定博客园文章。"
        : `${binding.state === "published" ? "已发布" : "草稿"} · ID ${binding.postId} · ${binding.account || "账号待验证"} · ${binding.source}`;
  }

  async function loadBinding() {
    const article = articleSelect.value;
    state.cnblogsBinding = null;
    BlogCTLPopup.setMessage(bindingMessage);
    candidatesSelect.replaceChildren(new Option("可选择候选文章", ""));
    referenceInput.value = "";
    renderBinding();
    if (!article) return;
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.binding", { article });
      if (article !== articleSelect.value) return;
      state.cnblogsBinding = response.found ? response.binding : null;
      renderBinding();
      renderPlatforms();
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    }
  }

  async function findCNBlogs() {
    const article = articleSelect.value;
    if (!article) return;
    findButton.disabled = true;
    BlogCTLPopup.setMessage(bindingMessage, "正在查询博客园文章…");
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.search", { article });
      if (article !== articleSelect.value) return;
      candidatesSelect.replaceChildren(new Option("选择候选文章", ""));
      for (const post of response.candidates ?? []) {
        const option = new Option(`${post.title} · ${post.published ? "已发布" : "草稿"} · ID ${post.id} · ${post.url || ""}`, post.id);
        candidatesSelect.append(option);
      }
      BlogCTLPopup.setMessage(bindingMessage, `找到 ${(response.candidates ?? []).length} 篇候选文章，请核对后绑定。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    } finally { renderBinding(); }
  }

  async function bindCNBlogs() {
    const article = articleSelect.value;
    const reference = referenceInput.value.trim() || candidatesSelect.value;
    if (!article || !reference) {
      BlogCTLPopup.setMessage(bindingMessage, "请先选候选文章，或填写文章 ID／链接。", "error");
      return;
    }
    const replace = Boolean(state.cnblogsBinding);
    if (replace && !confirm("将重新验证博客园文章，并更新当前绑定及远端修改时间基线。继续吗？")) return;
    bindButton.disabled = true;
    BlogCTLPopup.setMessage(bindingMessage, "正在验证博客园文章与当前账号…");
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.bind", { article, reference, replace });
      state.cnblogsBinding = response.binding;
      renderBinding();
      renderPlatforms();
      BlogCTLPopup.setMessage(bindingMessage, "绑定已保存到内容仓库。", "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    } finally { renderBinding(); }
  }

  async function updatePublishedCNBlogs() {
    const article = articleSelect.value;
    if (!article || state.cnblogsBinding?.state !== "published") return;
    if (!confirm("将本地文章内容更新到已发布的博客园文章。继续吗？")) return;
    updatePublishedButton.disabled = true;
    BlogCTLPopup.setMessage(bindingMessage, "正在启动已发布文章更新任务…");
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.update", { article });
      BlogCTLPopup.setMessage(bindingMessage, `任务 ${response.job?.id || ""} 已启动，请在“任务”页查看结果。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    } finally { renderBinding(); }
  }

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
      const availability = platform.id === "cnblogs" && state.cnblogsBinding?.state === "published"
        ? { available: false, reason: "已绑定已发布文章，请使用下方更新按钮" }
        : sourceAvailability.available ? toolAvailability : sourceAvailability;
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
      const nativeBrowserPlatform = NATIVE_BROWSER_PLATFORMS.has(platform.id);
      const apiPlatform = platform.id === "devto";
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
      platformsContainer.append(label);
    }
    if (!platformsContainer.childElementCount) platformsContainer.innerHTML = '<div class="platform-loading">没有可用平台</div>';
    updateStartButton();
  }

  async function startSync() {
    const article = articleSelect.value;
    const platforms = selectedPlatforms();
    if (!article || !platforms.length) return;
    startButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在创建同步任务…");
    try {
      const response = await BlogCTLPopup.send("blogctl.job.start", {
        request: { article, platforms, dryRun: false, changed: changedOnly.checked, draft: true, operation: "draft" },
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
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      updateStartButton();
    }
  }

  function init() {
    if (state.initialized) return;
    articleFilter = document.getElementById("articleFilter"); articleSelect = document.getElementById("articleSelect"); articleMeta = document.getElementById("articleMeta"); platformsContainer = document.getElementById("syncPlatforms"); changedOnly = document.getElementById("changedOnly"); startButton = document.getElementById("startSync"); message = document.getElementById("syncMessage");
    articleFilter.addEventListener("input", () => {
      const previous = articleSelect.value;
      renderArticles(); renderPlatforms();
      if (previous !== articleSelect.value) loadBinding();
    });
    articleSelect.addEventListener("change", () => { renderArticleMeta(); renderPlatforms(); loadBinding(); });
    startButton.addEventListener("click", startSync);
    bindingStatus = document.getElementById("cnblogsBindingStatus");
    bindingMessage = document.getElementById("cnblogsBindingMessage");
    findButton = document.getElementById("cnblogsFind");
    candidatesSelect = document.getElementById("cnblogsCandidates");
    referenceInput = document.getElementById("cnblogsReference");
    bindButton = document.getElementById("cnblogsBind");
    updatePublishedButton = document.getElementById("cnblogsUpdatePublished");
    findButton.addEventListener("click", findCNBlogs);
    bindButton.addEventListener("click", bindCNBlogs);
    updatePublishedButton.addEventListener("click", updatePublishedCNBlogs);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh().then(loadBinding); }
  function deactivate() { state.active = false; }
  root.BlogCTLSync = { init, activate, deactivate, refresh };
})(globalThis);
