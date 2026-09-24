"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    articles: [],
    selectedSlug: "",
    status: null,
    tools: [],
    cnblogsBindings: [],
    bindingLoading: false,
    bindingError: false,
    matches: {},
    matchKey: "",
    cachedMatchTime: 0,
    refreshSerial: 0,
    selectedMatchKeys: new Set(),
    bindingMutating: false,
  };

  let articlePicker, articleOptions, articleMeta, platformsContainer, message, refreshMatchesButton;
  let bulkActions, selectionSummary, bindSelectedButton, unbindSelectedButton;

  function selectedArticle() {
    return state.articles.find((item) => item.slug === state.selectedSlug);
  }

  function matchSelectionKey(platformID, item) {
    return [platformID, item.published ? "published" : "draft", String(item.id)].join(":");
  }

  function remoteStateName(item) {
    return item.published ? "published" : "draft";
  }

  function bindingStateChanged(item) {
    return Boolean(item.bound && item.bindingState && item.bindingState !== remoteStateName(item));
  }

  function selectedMatchEntries() {
    if (!state.selectedSlug || state.matchKey !== state.selectedSlug) return [];
    const selected = [];
    for (const platform of state.status?.platforms ?? []) {
      const match = state.matches[platform.id];
      for (const item of match?.items ?? []) {
        const key = matchSelectionKey(platform.id, item);
        if (state.selectedMatchKeys.has(key)) selected.push({ platform, item, key });
      }
    }
    return selected;
  }

  function detectablePlatformIDs() {
    return (state.status?.platforms ?? [])
      .filter((platform) => platformAvailability(selectedArticle(), platform).available)
      .map((platform) => platform.id);
  }

  function canBindItem(item) {
    const changed = bindingStateChanged(item);
    return (!item.bound || changed) && !(item.unverified && changed);
  }

  function canUnbindItem(item) {
    return Boolean(item.bound && item.bindingState);
  }

  function updateBulkActions() {
    if (!bulkActions) return;
    const entries = selectedMatchEntries();
    bulkActions.hidden = entries.length === 0;
    selectionSummary.textContent = "已选择 " + entries.length + " 篇文章";
    const bindable = entries.filter(({ item }) => canBindItem(item)).length;
    const unbindable = entries.filter(({ item }) => canUnbindItem(item)).length;
    bindSelectedButton.disabled = state.bindingMutating || bindable === 0;
    unbindSelectedButton.disabled = state.bindingMutating || unbindable === 0;
    bindSelectedButton.textContent = bindable > 0 ? "批量绑定 (" + bindable + ")" : "批量绑定";
    unbindSelectedButton.textContent = unbindable > 0 ? "批量解绑 (" + unbindable + ")" : "批量解绑";
  }

  function updateControls() {
    const ready = Boolean(state.selectedSlug) && Boolean(state.status?.bridge?.running);
    refreshMatchesButton.disabled = !ready || state.bindingLoading || state.bindingMutating;
    updateBulkActions();
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
    updateControls();
  }

  function selectArticle(article) {
    state.selectedSlug = article.slug;
    articlePicker.value = `${article.title} · ${article.slug}`;
    articleOptions.hidden = true;
    articlePicker.setAttribute("aria-expanded", "false");
    localStorage.setItem("blogctl.selectedArticle", article.slug);
    clearMatches();
    renderArticleMeta();
    renderPlatforms();
    loadSyncBinding();
  }

  function platformAvailability(_article, platform) {
    return BlogCTLSyncModel.deliveryToolAvailability(platform, state.tools);
  }

  function renderPlatformHeader(platform, article) {
    const availability = platformAvailability(article, platform);
    const header = document.createElement("div");
    header.className = "platform-choice platform-choice-static";

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
        ? "使用平台 API 接入"
        : platform.loggedIn
          ? (platform.inferred ? "浏览器会话可用 · 执行时再次校验" : "浏览器登录会话")
          : nativeBrowserPlatform
            ? "检测文章关联时同步浏览器登录"
            : platform.known === false
              ? "登录状态检测失败" + (platform.error ? " · " + platform.error : "")
              : "浏览器未登录";
    text.append(name, detail);

    const status = document.createElement("span");
    if (!availability.available) BlogCTLPopup.setStatus(status, "disabled", availability.reason);
    else if (apiPlatform) BlogCTLPopup.setStatus(status, "ok", "可用");
    else if (platform.loggedIn) BlogCTLPopup.setStatus(status, "ok", platform.inferred ? "会话可用" : "已登录");
    else if (nativeBrowserPlatform) BlogCTLPopup.setStatus(status, "unknown", "待校验");
    else if (platform.known === false) BlogCTLPopup.setStatus(status, "unknown", "未知");
    else BlogCTLPopup.setStatus(status, "error", "未登录");

    header.append(text, status);
    return header;
  }

  function appendMatchRows(platform, match, result) {
    for (const item of match.items ?? []) {
      const row = document.createElement("div");
      row.className = "article-match-row";

      const choice = document.createElement("label");
      choice.className = "article-match-choice";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.platform = platform.id;
      checkbox.dataset.postId = String(item.id);
      const key = matchSelectionKey(platform.id, item);
      checkbox.checked = state.selectedMatchKeys.has(key);
      checkbox.disabled = state.bindingLoading || state.bindingMutating || (!canBindItem(item) && !canUnbindItem(item));
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.selectedMatchKeys.add(key);
        else state.selectedMatchKeys.delete(key);
        updateBulkActions();
      });

      const text = document.createElement("span");
      text.className = "article-match-choice-text";
      const parts = [
        item.localOnly ? "本地记录" : item.bound ? "已绑定" : "候选",
        item.title,
        item.published ? "已发布" : "草稿",
        "ID " + item.id,
      ];
      if (bindingStateChanged(item)) parts.push("远端状态已变化");
      text.textContent = parts.join(" · ");
      choice.append(checkbox, text);
      row.append(choice);

      if (item.url && /^https:\/\/(?:www\.cnblogs\.com|i\.cnblogs\.com|blog\.csdn\.net|editor\.csdn\.net|dev\.to|segmentfault\.com|zhuanlan\.zhihu\.com|my\.oschina\.net|medium\.com|juejin\.cn|blog\.51cto\.com)\//.test(item.url)) {
        const links = document.createElement("div");
        links.className = "article-match-links";
        const link = document.createElement("a");
        link.textContent = "查看文章";
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
        row.append(links);
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
          await loadSyncBinding();
          await refreshArticleMatches();
          BlogCTLPopup.setMessage(message, "绑定已保存。", "ok");
        } catch (error) {
          BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
        } finally {
          bind.disabled = false;
        }
      });
      manual.append(summary, input, bind);
      result.append(manual);
    } else if (platform.id === "csdn") {
      const manual = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "候选中没有？输入 CSDN 文章 ID／链接";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "CSDN 文章 ID、公开链接或编辑链接";
      input.autocomplete = "off";
      const bind = document.createElement("button");
      bind.type = "button";
      bind.className = "secondary";
      bind.textContent = "验证并绑定";
      bind.addEventListener("click", async () => {
        const reference = input.value.trim();
        if (!reference) return;
        const article = state.selectedSlug;
        const bindings = state.matches.csdn?.bindings ?? [];
        bind.disabled = true;
        try {
          if (bindings.length && !confirm("将验证该 CSDN 文章；如果对应状态已有绑定，会替换原绑定。继续吗？")) return;
          await BlogCTLPopup.send("blogctl.csdn.bind", {
            article,
            postId: reference,
            state: "",
            replace: bindings.length > 0,
          });
          if (article !== state.selectedSlug) return;
          await refreshArticleMatches();
          BlogCTLPopup.setMessage(message, "CSDN 绑定已保存。", "ok");
        } catch (error) {
          BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
        } finally {
          bind.disabled = false;
        }
      });
      manual.append(summary, input, bind);
      result.append(manual);
    } else if (!(match.items ?? []).length) {
      const note = document.createElement("small");
      note.className = "job-platform-message";
      note.textContent = "当前平台没有可绑定的远端候选，或尚未接入手动绑定。";
      result.append(note);
    }
  }

  function renderPlatforms() {
    const article = selectedArticle();
    const currentKey = state.selectedSlug;
    platformsContainer.replaceChildren();

    for (const platform of state.status?.platforms ?? []) {
      const card = document.createElement("div");
      card.className = "platform-choice-card";
      card.append(renderPlatformHeader(platform, article));

      const match = state.matches[platform.id];
      if (match && state.matchKey === currentKey) {
        const result = document.createElement("div");
        result.className = "article-match";
        const prefix = state.cachedMatchTime
          ? "上次检测 " + new Date(state.cachedMatchTime).toLocaleString() + " · "
          : "";
        result.textContent = prefix + match.text;
        appendMatchRows(platform, match, result);
        card.append(result);
      } else if (state.selectedSlug) {
        const note = document.createElement("div");
        note.className = "article-match";
        const availability = platformAvailability(article, platform);
        note.textContent = availability.available
          ? "点击左上角“检测文章关联”读取远端候选与本地绑定状态。"
          : availability.reason;
        card.append(note);
      }

      platformsContainer.append(card);
    }

    if (!platformsContainer.childElementCount) {
      platformsContainer.innerHTML = '<div class="platform-loading">没有可用平台</div>';
    }
    updateControls();
  }

  function clearMatches() {
    state.matches = {};
    state.matchKey = "";
    state.cachedMatchTime = 0;
    state.selectedMatchKeys.clear();
    BlogCTLSyncState.clearMatches(localStorage);
    state.refreshSerial++;
    updateBulkActions();
  }

  async function refreshArticleMatches(allowBridgeRestart = true) {
    const article = state.selectedSlug;
    const platforms = detectablePlatformIDs();
    if (!article) return;
    if (!platforms.length) {
      BlogCTLPopup.setMessage(message, "当前没有可检测的平台。", "error");
      return;
    }

    state.selectedMatchKeys.clear();
    updateBulkActions();
    const serial = ++state.refreshSerial;
    state.matchKey = article;
    state.cachedMatchTime = 0;
    state.matches = Object.fromEntries(platforms.map((platform) => [platform, { text: "正在检测文章关联…" }]));
    renderPlatforms();
    refreshMatchesButton.disabled = true;

    const results = await Promise.all(platforms.map(async (platform) => {
      try {
        const response = await BlogCTLPopup.send("blogctl.article.match", { article, platform });
        return [platform, response.match];
      } catch (error) {
        return [platform, { text: `检测失败：${BlogCTLPopup.errorMessage(error)}`, items: [] }];
      }
    }));

    if (serial !== state.refreshSerial || article !== state.selectedSlug) return;

    const staleBridge = results.some(([, match]) => String(match?.text || "").includes("invalid bridge token"));
    if (staleBridge && allowBridgeRestart) {
      BlogCTLPopup.setMessage(message, "检测到 Bridge 仍在运行旧接口，正在重启后重新检测…");
      try {
        await BlogCTLPopup.send("blogctl.tool.action", { name: "bridge", action: "restart" });
        if (article !== state.selectedSlug) return;
        await refreshArticleMatches(false);
        return;
      } catch (error) {
        BlogCTLPopup.setMessage(message, `Bridge 重启失败：${BlogCTLPopup.errorMessage(error)}`, "error");
      }
    }

    state.matches = Object.fromEntries(results);
    state.cachedMatchTime = Date.now();
    BlogCTLSyncState.saveMatches(localStorage, article, state.matches);
    renderPlatforms();
  }

  function platformBindings(platformID) {
    return platformID === "cnblogs"
      ? state.cnblogsBindings
      : (state.matches[platformID]?.bindings ?? []);
  }

  function existingBinding(platformID, stateName) {
    return platformBindings(platformID).find((binding) => binding.state === stateName);
  }

  function batchEntries(action) {
    return selectedMatchEntries().filter(({ item }) => action === "bind" ? canBindItem(item) : canUnbindItem(item));
  }

  async function runBulkBinding(action) {
    const article = state.selectedSlug;
    const entries = batchEntries(action);
    if (!article || !entries.length || state.bindingMutating) return;

    if (action === "bind") {
      const targets = new Set();
      for (const { platform, item } of entries) {
        const target = platform.id + ":" + remoteStateName(item);
        if (targets.has(target)) {
          BlogCTLPopup.setMessage(message, "同一平台的同一状态一次只能绑定一篇文章，请减少勾选后重试。", "error");
          return;
        }
        targets.add(target);
      }

      const replacements = entries.filter(({ platform, item }) => {
        const bound = existingBinding(platform.id, remoteStateName(item));
        return bound && String(bound.postId) !== String(item.id);
      });
      if (replacements.length && !confirm("所选文章中有 " + replacements.length + " 条会替换当前绑定。继续吗？")) return;
    } else if (!confirm("将解除所选 " + entries.length + " 条本地绑定，远端文章不会删除。继续吗？")) {
      return;
    }

    state.bindingMutating = true;
    updateControls();
    BlogCTLPopup.setMessage(message, action === "bind" ? "正在批量验证并绑定…" : "正在批量解除本地绑定…");

    let success = 0;
    const failures = [];
    let touchedCnblogs = false;
    for (const { platform, item } of entries) {
      try {
        const stateName = action === "bind" ? remoteStateName(item) : (item.bindingState || remoteStateName(item));
        const bound = existingBinding(platform.id, stateName);
        const payload = {
          article,
          state: stateName,
          postId: item.id,
          replace: action === "bind" && Boolean(bound && String(bound.postId) !== String(item.id)),
          candidate: {
            id: item.id,
            title: item.title,
            url: item.url || "",
            published: Boolean(item.published),
          },
        };
        if (platform.id === "cnblogs") {
          payload.reference = item.id;
          touchedCnblogs = true;
        }
        await BlogCTLPopup.send("blogctl." + platform.id + "." + (action === "bind" ? "bind" : "unbind"), payload);
        success++;
      } catch (error) {
        failures.push((platform.label || platform.id) + " / " + item.title + "：" + BlogCTLPopup.errorMessage(error));
      }
    }

    state.selectedMatchKeys.clear();
    try {
      if (touchedCnblogs) await loadSyncBinding();
      await refreshArticleMatches();
    } finally {
      state.bindingMutating = false;
      updateControls();
    }

    if (failures.length) {
      BlogCTLPopup.setMessage(
        message,
        "批量操作完成：成功 " + success + "，失败 " + failures.length + "。 " + failures.slice(0, 2).join("；"),
        "error",
      );
    } else {
      BlogCTLPopup.setMessage(message, action === "bind" ? "批量绑定已完成。" : "批量解绑已完成。", "ok");
    }
  }

  async function loadSyncBinding() {
    const article = state.selectedSlug;
    state.cnblogsBindings = [];
    state.bindingError = false;
    state.bindingLoading = Boolean(article);
    updateControls();
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

  async function refresh() {
    if (!state.active) return;
    BlogCTLPopup.setMessage(message);
    try {
      const [articlesResponse, statusResponse, toolsResponse] = await Promise.all([
        BlogCTLPopup.send("blogctl.articles"),
        BlogCTLPopup.send("blogctl.status"),
        BlogCTLPopup.send("blogctl.tools"),
      ]);

      state.articles = articlesResponse.articles ?? [];
      state.status = statusResponse.status;
      state.tools = toolsResponse.tools ?? [];

            BlogCTLPopup.refreshBridgeIndicator(state.status).catch(() => {});

      const previous = state.selectedSlug || localStorage.getItem("blogctl.selectedArticle") || "";
      if (state.articles.some((item) => item.slug === previous)) {
        state.selectedSlug = previous;
        const selected = selectedArticle();
        articlePicker.value = `${selected.title} · ${selected.slug}`;
      } else {
        state.selectedSlug = "";
      }

      if (state.selectedSlug && state.matchKey !== state.selectedSlug) {
        const cached = BlogCTLSyncState.loadMatches(localStorage, state.selectedSlug);
        if (cached) {
          state.matches = cached.matches;
          state.matchKey = state.selectedSlug;
          state.cachedMatchTime = cached.savedAt;
        }
      }

      renderArticles();
      renderPlatforms();
      if (state.selectedSlug) loadSyncBinding();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      updateControls();
    }
  }

  function init() {
    if (state.initialized) return;

    articlePicker = document.getElementById("articlePicker");
    articleOptions = document.getElementById("articleOptions");
    articleMeta = document.getElementById("articleMeta");
    platformsContainer = document.getElementById("syncPlatforms");
    message = document.getElementById("syncMessage");
    refreshMatchesButton = document.getElementById("refreshArticleMatches");
    bulkActions = document.getElementById("bindingBulkActions");
    selectionSummary = document.getElementById("bindingSelectionSummary");
    bindSelectedButton = document.getElementById("bindSelectedMatches");
    unbindSelectedButton = document.getElementById("unbindSelectedMatches");

    articlePicker.addEventListener("focus", () => {
      articleOptions.hidden = false;
      renderArticles();
    });
    articlePicker.addEventListener("input", () => {
      state.selectedSlug = "";
      clearMatches();
      renderPlatforms();
      articleOptions.hidden = false;
      renderArticles();
    });
    articlePicker.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        articleOptions.hidden = true;
        articlePicker.setAttribute("aria-expanded", "false");
      }
      if (event.key === "Enter" && !articleOptions.hidden && articleOptions.querySelector("button")) {
        event.preventDefault();
        articleOptions.querySelector("button").click();
      }
    });
    document.addEventListener("click", (event) => {
      if (event.target !== articlePicker && !articleOptions.contains(event.target)) {
        articleOptions.hidden = true;
        articlePicker.setAttribute("aria-expanded", "false");
      }
    });

    refreshMatchesButton.addEventListener("click", () => refreshArticleMatches());
    bindSelectedButton.addEventListener("click", () => runBulkBinding("bind"));
    unbindSelectedButton.addEventListener("click", () => runBulkBinding("unbind"));
    state.initialized = true;
  }

  function activate() {
    state.active = true;
    refresh();
  }

  function deactivate() {
    state.active = false;
  }

  root.BlogCTLSync = { init, activate, deactivate, refresh };
})(globalThis);
