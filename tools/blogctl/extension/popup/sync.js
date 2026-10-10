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
    selectedPlatformIDs: new Set(BlogCTLSyncModel.visiblePlatformIDs(BlogCTLSyncState.loadPlatforms(localStorage))),
    platformSelectionInitialized: false,
    selectedMatchKeys: new Set(),
    bindingMutating: false,
    matchingPlatforms: new Set(),
  };

  let platformsContainer, message, refreshMatchesButton;
  let selectAllButton, invertButton, bulkActions, selectionSummary, bindSelectedButton, unbindSelectedButton;

  function selectedArticle() {
    return state.articles.find((item) => item.slug === state.selectedSlug);
  }

  function selectedPlatformIDs() {
    return BlogCTLSyncModel.visiblePlatformIDs([...state.selectedPlatformIDs]);
  }

  function pruneSelectedMatchesToPlatforms() {
    for (const key of [...state.selectedMatchKeys]) {
      const platformID = key.split(":", 1)[0];
      if (!state.selectedPlatformIDs.has(platformID)) state.selectedMatchKeys.delete(key);
    }
  }

  function setSyncPlatforms(mode) {
    if (!state.selectedSlug) return;
    const selectable = BlogCTLSyncModel.visiblePlatforms(state.status?.platforms)
      .filter((platform) => platformAvailability(selectedArticle(), platform).available);
    state.selectedPlatformIDs = new Set(
      selectable
        .filter((platform) => mode === "all" ? true : !state.selectedPlatformIDs.has(platform.id))
        .map((platform) => platform.id),
    );
    pruneSelectedMatchesToPlatforms();
    BlogCTLSyncState.savePlatforms(localStorage, selectedPlatformIDs());
    renderPlatforms();
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
    for (const platform of BlogCTLSyncModel.visiblePlatforms(state.status?.platforms)) {
      if (!state.selectedPlatformIDs.has(platform.id)) continue;
      const match = state.matches[platform.id];
      for (const item of match?.items ?? []) {
        const key = matchSelectionKey(platform.id, item);
        if (state.selectedMatchKeys.has(key)) selected.push({ platform, item, key });
      }
    }
    return selected;
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
    refreshMatchesButton.disabled = !ready || state.bindingLoading || state.bindingMutating ||
      state.matchingPlatforms.size > 0 || state.selectedPlatformIDs.size === 0;
    updateBulkActions();
  }

  function platformAvailability(_article, platform) {
    return BlogCTLSyncModel.deliveryToolAvailability(platform, state.tools);
  }

  function renderPlatformHeader(platform, article) {
    const availability = platformAvailability(article, platform);
    const header = document.createElement("label");
    header.className = "platform-choice";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.platform = platform.id;
    checkbox.checked = availability.available && state.selectedPlatformIDs.has(platform.id);
    checkbox.disabled = !availability.available || state.bindingLoading || state.bindingMutating;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selectedPlatformIDs.add(platform.id);
      else state.selectedPlatformIDs.delete(platform.id);
      pruneSelectedMatchesToPlatforms();
      BlogCTLSyncState.savePlatforms(localStorage, selectedPlatformIDs());
      renderPlatforms();
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
    if (!availability.available) BlogCTLPopup.setStatus(status, "disabled", "不可检测", availability.reason);
    else if (apiPlatform) BlogCTLPopup.setStatus(status, "ok", "可用");
    else if (platform.loggedIn) BlogCTLPopup.setStatus(status, "ok", platform.inferred ? "会话可用" : "已登录");
    else if (nativeBrowserPlatform) BlogCTLPopup.setStatus(status, "unknown", "待校验");
    else if (platform.known === false) BlogCTLPopup.setStatus(status, "unknown", "未知");
    else BlogCTLPopup.setStatus(status, "error", "未登录");

    header.append(checkbox, text, status);
    return header;
  }

  const manualBindingPlatforms = new Set([
    "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "devto", "medium",
  ]);

  function manualBindingPlaceholder(platformID) {
    const labels = {
      cnblogs: "博客园文章／草稿 ID 或链接",
      juejin: "掘金文章／草稿 ID 或链接",
      csdn: "CSDN 文章／草稿 ID 或链接",
      segmentfault: "思否文章／草稿 ID 或链接",
      zhihu: "知乎文章 ID 或链接",
      "51cto": "51CTO 文章／草稿 ID 或链接",
      oschina: "开源中国文章／草稿 ID 或链接",
      devto: "DEV.to 文章 ID（或带 ID 的后台链接）",
      medium: "Medium 文章 ID 或链接",
    };
    return labels[platformID] || "文章 ID 或链接";
  }

  function manualBindingID(platformID, reference) {
    const raw = String(reference || "").trim();
    if (!raw) return "";
    if (platformID === "cnblogs" || platformID === "csdn") {
      // Normalize known creator/public URLs for same-ID binding comparisons.
      // The Bridge still receives the original CNBlogs reference and performs
      // the authoritative owner/state verification before writing a binding.
      if (/^[0-9]+$/.test(raw)) return raw;
      try {
        const parsed = new URL(raw);
        if (parsed.protocol === "https:" &&
            (platformID === "cnblogs"
              ? ["i.cnblogs.com", "www.cnblogs.com"].includes(parsed.hostname)
              : ["editor.csdn.net", "blog.csdn.net"].includes(parsed.hostname))) {
          const id = platformID === "cnblogs"
            ? parsed.searchParams.get("postId") ||
              parsed.pathname.match(/(?:\/posts\/edit;postId=|\/articles\/edit;postId=|\/p\/)([0-9]+)/)?.[1]
            : parsed.searchParams.get("articleId") ||
              parsed.pathname.match(/\/article\/details\/([0-9]+)/)?.[1];
          if (/^[0-9]+$/.test(id || "")) return id;
        }
      } catch { /* Backend validates malformed or unsupported references. */ }
      return raw;
    }
    if (/^[A-Za-z0-9_-]+$/.test(raw) && !raw.includes(".")) return raw;

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return "";
    }
    const path = parsed.pathname;
    if (platformID === "segmentfault") return parsed.searchParams.get("draftId") || path.match(/\/a\/([0-9]+)/)?.[1] || "";
    if (platformID === "zhihu") return path.match(/\/p\/([A-Za-z0-9_-]+)/)?.[1] || "";
    if (platformID === "juejin") return path.match(/\/post\/([0-9]+)/)?.[1] || path.match(/\/editor\/drafts\/([0-9]+)/)?.[1] || "";
    if (platformID === "oschina") return path.match(/\/blog\/ai-write\/draft\/([0-9]+)/)?.[1] || path.match(/\/blog\/([0-9]+)/)?.[1] || "";
    if (platformID === "51cto") return path.match(/\/([0-9]+)\/?$/)?.[1] || "";
    if (platformID === "devto") return path.match(/\/([0-9]+)(?:\/edit)?\/?$/)?.[1] || "";
    if (platformID === "medium") return path.match(/\/p\/([0-9a-f]{8,})(?:\/edit)?\/?$/i)?.[1] || path.match(/-([0-9a-f]{8,})\/?$/i)?.[1] || "";
    return "";
  }

  function appendManualBinding(platform, match, result) {
    if (!manualBindingPlatforms.has(platform.id)) return;
    const manual = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "候选中没有？输入文章／草稿 ID 或链接";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = manualBindingPlaceholder(platform.id);
    input.autocomplete = "off";

    const stateSelect = document.createElement("select");
    for (const stateName of ["draft", "published"]) {
      const option = document.createElement("option");
      option.value = stateName;
      option.textContent = stateName === "published" ? "已发布" : "草稿";
      stateSelect.append(option);
    }

    const bind = document.createElement("button");
    bind.type = "button";
    bind.className = "secondary";
    bind.textContent = "验证并绑定";
    bind.addEventListener("click", async () => {
      const reference = input.value.trim();
      if (!reference) return;
      const article = state.selectedSlug;
      const bindings = platform.id === "cnblogs" ? state.cnblogsBindings : (match.bindings ?? []);
      bind.disabled = true;
      stateSelect.disabled = true;
      try {
        const postId = manualBindingID(platform.id, reference);
        if (!postId) throw new Error("无法从输入内容识别远端文章 ID");
        const stateName = stateSelect.value;
        const existing = bindings.find((binding) => binding.state === stateName);
        const replaces = Boolean(existing && String(existing.postId) !== String(postId));
        if (replaces && !confirm("将替换当前" + (stateName === "published" ? "已发布文章" : "草稿") + "绑定。继续吗？")) return;

        if (platform.id === "cnblogs") {
          // CNBlogs accepts an article ID or creator/public URL and verifies
          // the requested state against the authenticated remote post.
          await BlogCTLPopup.send("blogctl.cnblogs.bind", {
            article, reference, state: stateName, replace: replaces,
          });
          await loadSyncBinding();
        } else {
          await BlogCTLPopup.send("blogctl." + platform.id + ".bind", {
            article, postId, state: stateName, replace: replaces, manual: true,
          });
        }
        if (article !== state.selectedSlug) return;
        await refreshArticleMatches();
        BlogCTLPopup.setMessage(message, (platform.label || platform.id) + " 绑定已保存。", "ok");
      } catch (error) {
        BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      } finally {
        bind.disabled = false;
        stateSelect.disabled = false;
      }
    });

    manual.append(summary, input);
    manual.append(stateSelect);
    manual.append(bind);
    result.append(manual);
  }

  async function reverifyToutiaoPublished(item) {
    const article = state.selectedSlug;
    if (!article || state.bindingMutating || !item?.bound || !item?.published) return;
    state.bindingMutating = true;
    updateControls();
    BlogCTLPopup.setMessage(message, "正在重新验证头条原文章及远端版本…");
    try {
      await BlogCTLPopup.send("blogctl.toutiao.bind", {
        article, state: "published", postId: item.id, replace: false,
      });
      await refreshArticleMatches(["toutiao"]);
      BlogCTLPopup.setMessage(message, "已重新验证头条文章；可继续使用「更新已发布」。", "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      state.bindingMutating = false;
      updateControls();
    }
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

      const articleLink = BlogCTLSyncModel.articleMatchLink(platform.id, item);
      if (articleLink) {
        const links = document.createElement("div");
        links.className = "article-match-links";
        const link = document.createElement("a");
        link.textContent = articleLink.label;
        link.href = articleLink.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
        if (platform.id === "toutiao" && item.published && /^[0-9]{8,20}$/.test(String(item.id))) {
          const edit = document.createElement("a");
          edit.textContent = "编辑原文";
          edit.href = "https://mp.toutiao.com/profile_v4/graphic/publish?from=edit&pgc_id=" + encodeURIComponent(item.id);
          edit.target = "_blank";
          edit.rel = "noopener noreferrer";
          links.append(edit);
          if (item.bound && item.bindingState === "published") {
            const reverify = document.createElement("button");
            reverify.type = "button";
            reverify.className = "secondary compact";
            reverify.textContent = "重新校验版本";
            reverify.disabled = state.bindingMutating;
            reverify.addEventListener("click", () => reverifyToutiaoPublished(item));
            links.append(reverify);
          }
        }
        row.append(links);
      }

      result.append(row);
    }

    appendManualBinding(platform, match, result);
  }

  function renderPlatforms() {
    const article = selectedArticle();
    const currentKey = state.selectedSlug;
    platformsContainer.replaceChildren();

    for (const platform of BlogCTLSyncModel.visiblePlatforms(state.status?.platforms)) {
      const card = document.createElement("div");
      card.className = "platform-choice-card";
      card.dataset.associationPlatform = platform.id;
      card.append(renderPlatformHeader(platform, article));

      const availability = platformAvailability(article, platform);
      const actions = document.createElement("div");
      actions.className = "platform-card-actions";
      const detectPlatformButton = document.createElement("button");
      detectPlatformButton.type = "button";
      detectPlatformButton.className = "secondary compact";
      detectPlatformButton.textContent = state.matchingPlatforms.has(platform.id) ? "检测中…" : "检测此平台";
      detectPlatformButton.disabled = !state.selectedSlug || !availability.available ||
        !state.status?.bridge?.running || state.bindingLoading || state.bindingMutating ||
        state.matchingPlatforms.size > 0;
      detectPlatformButton.addEventListener("click", () => refreshArticleMatches([platform.id]));
      actions.append(detectPlatformButton);
      card.append(actions);

      const selected = state.selectedPlatformIDs.has(platform.id);
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
      } else if (state.selectedSlug && availability.available) {
        const note = document.createElement("div");
        note.className = "article-match";
        note.textContent = selected
          ? "点击“检测文章关联”读取远端候选与本地绑定状态。"
          : "未选择检测此平台。";
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
    state.matchingPlatforms.clear();
    BlogCTLSyncState.clearMatches(localStorage);
    state.refreshSerial++;
    updateBulkActions();
  }

  async function refreshArticleMatches(platformIDs = selectedPlatformIDs(), allowBridgeRestart = true) {
    const article = state.selectedSlug;
    const platforms = BlogCTLSyncModel.visiblePlatformIDs([...new Set(platformIDs)]).filter(Boolean);
    if (!article) return;
    if (!platforms.length) {
      BlogCTLPopup.setMessage(message, "请先选择至少一个需要检测的平台。", "error");
      return;
    }

    state.selectedMatchKeys.clear();
    updateBulkActions();
    const serial = ++state.refreshSerial;
    state.matchKey = article;
    state.cachedMatchTime = 0;
    for (const platform of platforms) {
      state.matchingPlatforms.add(platform);
      state.matches[platform] = { text: "正在检测文章关联…" };
    }
    renderPlatforms();

    const results = await Promise.all(platforms.map(async (platform) => {
      try {
        const response = await BlogCTLPopup.send("blogctl.article.match", { article, platform });
        return [platform, response.match];
      } catch (error) {
        return [platform, { text: `检测失败：${BlogCTLPopup.errorMessage(error)}`, items: [] }];
      }
    }));

    if (serial !== state.refreshSerial || article !== state.selectedSlug) {
      for (const platform of platforms) state.matchingPlatforms.delete(platform);
      renderPlatforms();
      return;
    }

    const staleBridge = results.some(([, match]) => String(match?.text || "").includes("invalid bridge token"));
    if (staleBridge && allowBridgeRestart) {
      BlogCTLPopup.setMessage(message, "检测到 Bridge 仍在运行旧接口，正在重启后重新检测…");
      try {
        await BlogCTLPopup.send("blogctl.tool.action", { name: "bridge", action: "restart" });
        if (article !== state.selectedSlug) return;
        await refreshArticleMatches(platforms, false);
        return;
      } catch (error) {
        BlogCTLPopup.setMessage(message, `Bridge 重启失败：${BlogCTLPopup.errorMessage(error)}`, "error");
      }
    }

    for (const [platform, match] of results) state.matches[platform] = match;
    state.cachedMatchTime = Date.now();
    BlogCTLSyncState.saveMatches(localStorage, article, state.matches);
    for (const platform of platforms) state.matchingPlatforms.delete(platform);
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

      const selectable = BlogCTLSyncModel.visiblePlatforms(state.status?.platforms)
        .filter((platform) => platformAvailability(selectedArticle(), platform).available)
        .map((platform) => platform.id);
      if (!state.platformSelectionInitialized) {
        const stored = selectedPlatformIDs().filter((id) => selectable.includes(id));
        state.selectedPlatformIDs = new Set(stored.length ? stored : selectable);
        state.platformSelectionInitialized = true;
        BlogCTLSyncState.savePlatforms(localStorage, selectedPlatformIDs());
      } else {
        state.selectedPlatformIDs = new Set(selectedPlatformIDs().filter((id) => selectable.includes(id)));
        pruneSelectedMatchesToPlatforms();
      }

      BlogCTLPopup.refreshBridgeIndicator(state.status).catch(() => {});

      const previous = state.selectedSlug || localStorage.getItem("blogctl.selectedArticle") || "";
      if (state.articles.some((item) => item.slug === previous)) {
        state.selectedSlug = previous;

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

      renderPlatforms();
      if (state.selectedSlug) loadSyncBinding();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      updateControls();
    }
  }

  function init() {
    if (state.initialized) return;

    platformsContainer = document.getElementById("syncPlatforms");
    message = document.getElementById("syncMessage");
    refreshMatchesButton = document.getElementById("refreshArticleMatches");
    selectAllButton = document.getElementById("selectAllSyncPlatforms");
    invertButton = document.getElementById("invertSyncPlatforms");
    bulkActions = document.getElementById("bindingBulkActions");
    selectionSummary = document.getElementById("bindingSelectionSummary");
    bindSelectedButton = document.getElementById("bindSelectedMatches");
    unbindSelectedButton = document.getElementById("unbindSelectedMatches");

    // A state-specific unbind from the Update tab invalidates cached
    // detection results. Recheck manually rather than displaying stale
    // "已绑定" rows from the previous scan.
    document.addEventListener("blogctl:binding-changed", (event) => {
      if (event.detail?.article !== state.selectedSlug) return;
      clearMatches();
      if (state.active) {
        renderPlatforms();
        loadSyncBinding();
      }
    });

    refreshMatchesButton.addEventListener("click", () => refreshArticleMatches());
    selectAllButton.addEventListener("click", () => setSyncPlatforms("all"));
    invertButton.addEventListener("click", () => setSyncPlatforms("invert"));
    bindSelectedButton.addEventListener("click", () => runBulkBinding("bind"));
    unbindSelectedButton.addEventListener("click", () => runBulkBinding("unbind"));
    document.addEventListener("blogctl:detect-association", async (event) => {
      const platformID = String(event.detail?.platform || "");
      const article = String(event.detail?.article || "");
      if (!state.active || state.selectedSlug !== article ||
          !BlogCTLSyncModel.isVisiblePlatform(platformID)) return;
      state.selectedPlatformIDs.add(platformID);
      document.getElementById("updateAssociationDetails").open = true;
      renderPlatforms();
      await refreshArticleMatches([platformID]);
      const area = document.getElementById("syncPlatforms");
      area?.querySelector(`[data-association-platform="${platformID}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    document.addEventListener("blogctl:article-selected", (event) => {
      const article = String(event.detail?.article || "").trim();
      if (article === state.selectedSlug) return;
      state.selectedSlug = article;
      state.selectedMatchKeys.clear();
      clearMatches();
      if (state.active) {
        renderPlatforms();
        loadSyncBinding();
      }
    });
    state.initialized = true;
  }

  function activate() {
    state.active = true;
    state.selectedSlug = localStorage.getItem("blogctl.selectedArticle") || "";
    refresh();
  }

  function deactivate() {
    state.active = false;
  }

  root.BlogCTLSync = { init, activate, deactivate, refresh };
})(globalThis);
