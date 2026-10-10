"use strict";

// Update-target discovery. No PublicationBinding mutations: selected remote IDs
// are forwarded directly to an explicit, durable task snapshot.
(function (root) {
  const state = {
    initialized: false, active: false, article: "", matches: {},
    selected: new Map(), pending: new Set(), serial: 0,
  };
  let detectButton, message;

  function selectedTargets() {
    return [...state.selected.values()].map((item) => ({ ...item }));
  }

  function refreshToolbar() {
    if (!detectButton) return;
    detectButton.disabled = !state.article || state.pending.size > 0 ||
      root.BlogCTLDrafts?.isJobRunning?.() ||
      !(root.BlogCTLDrafts?.selectedPlatformIDs?.().length);
  }

  function render() {
    refreshToolbar();
    document.dispatchEvent(new CustomEvent("blogctl:association-results-changed"));
  }

  function clearMatches() {
    state.matches = {};
    state.selected.clear();
    ++state.serial;
    state.pending.clear();
    render();
  }

  async function refreshArticleMatches(platformIDs = root.BlogCTLDrafts?.selectedPlatformIDs?.() ?? []) {
    const article = state.article;
    const platforms = BlogCTLSyncModel.visiblePlatformIDs([...new Set(platformIDs)]).filter(Boolean);
    if (!article || !platforms.length) {
      BlogCTLPopup.setMessage(message, "先选择本地文章和至少一个平台。", "error");
      return;
    }
    // Explicit selections expire on detection/identity changes. A new scan
    // cannot silently reuse an earlier target ID.
    for (const platform of platforms) {
      state.matches[platform] = { text: "正在检测文章关联…", items: [] };
      for (const key of state.selected.keys()) if (key.startsWith(platform + ":")) state.selected.delete(key);
      state.pending.add(platform);
    }
    const serial = ++state.serial;
    render();
    const results = await Promise.all(platforms.map(async (platform) => {
      try {
        const data = await BlogCTLPopup.send("blogctl.article.match", { article, platform });
        return [platform, data.match || { text: "无候选文章", items: [] }];
      } catch (error) {
        return [platform, { text: "检测失败：" + BlogCTLPopup.errorMessage(error), items: [], failed: true }];
      }
    }));
    if (serial !== state.serial || article !== state.article) return;
    for (const [platform, match] of results) {
      state.matches[platform] = match;
      state.pending.delete(platform);
    }
    render();
  }

  function availableForUpdate(platform, item) {
    if (!item || !String(item.id || "").trim() || item.localOnly) return false;
    if (item.published) {
      // A published article may only use the platform's explicit safe update
      // contract; it is NEVER routed through draft update.
      return platform.capabilities?.publishedUpdate === true &&
        ["cnblogs", "devto"].includes(platform.id);
    }
    return platform.capabilities?.draftCreate === true;
  }

  function appendPlatformMatches(platform, container) {
    if (!state.article || !state.matches[platform.id]) return;
    const match = state.matches[platform.id];
    const section = document.createElement("div");
    section.className = "article-match";
    const summary = document.createElement("p");
    summary.className = "card-hint";
    summary.textContent = match.text || "检测完成";
    section.append(summary);

    for (const item of match.items || []) {
      if (!item?.id) continue;
      const row = document.createElement("div");
      row.className = "article-match-row";
      const target = {
        platform: platform.id, id: String(item.id),
        state: item.published ? "published" : "draft",
        url: String(item.url || ""),
        updatedAt: String(item.updatedAt || item.remoteUpdatedAt || ""),
      };
      const key = platform.id + ":" + target.id;
      const check = document.createElement("label");
      check.className = "article-match-choice";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.dataset.platform = platform.id;
      box.dataset.postId = target.id;
      box.checked = state.selected.has(key);
      box.disabled = !availableForUpdate(platform, item) ||
        root.BlogCTLDrafts?.isJobRunning?.();
      box.addEventListener("change", () => {
        if (box.checked) state.selected.set(key, target);
        else state.selected.delete(key);
        root.BlogCTLDrafts?.selectionChanged?.();
      });
      const title = document.createElement("span");
      title.className = "article-match-choice-text";
      title.textContent = [
        item.title || "(无标题)",
        item.published ? "已发布" : "草稿",
        "ID " + item.id,
      ].join(" · ");
      check.append(box, title);
      row.append(check);
      const link = BlogCTLSyncModel.articleMatchLink(platform.id, item);
      if (link) {
        const anchor = document.createElement("a");
        anchor.href = link.url;
        anchor.textContent = link.label;
        anchor.rel = "noopener noreferrer";
        anchor.target = "_blank";
        row.append(anchor);
      }
      if (availableForUpdate(platform, item)) {
        const action = document.createElement("button");
        action.type = "button";
        action.className = "secondary compact";
        action.textContent = "更新此文章";
        action.disabled = root.BlogCTLDrafts?.isJobRunning?.();
        action.addEventListener("click", () =>
          root.BlogCTLDrafts?.updateTargets?.([target], false));
        row.append(action);
      }
      section.append(row);
    }

    // Useful for providers whose drafts cannot be enumerated, e.g. Juejin.
    // The ID is still verified by the server-side adapter when updating.
    const manual = document.createElement("details");
    const head = document.createElement("summary");
    head.textContent = "候选中没有？按远端 ID 指定目标";
    const idInput = document.createElement("input");
    idInput.placeholder = "远端文章或草稿 ID";
    const select = document.createElement("select");
    for (const value of ["draft", "published"]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value === "draft" ? "草稿" : "已发布";
      select.append(option);
    }
    const add = document.createElement("button");
    add.type = "button";
    add.className = "secondary compact";
    add.textContent = "添加目标";
    add.addEventListener("click", () => {
      const id = idInput.value.trim();
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
        BlogCTLPopup.setMessage(message, "远端 ID 格式不正确", "error"); return;
      }
      const target = { platform: platform.id, id, state: select.value, url: "" };
      if (!availableForUpdate(platform, { id, published: select.value === "published" })) {
        BlogCTLPopup.setMessage(message, "此平台不支持所选状态的安全更新", "error"); return;
      }
      state.selected.set(platform.id + ":" + id, target);
      render();
      root.BlogCTLDrafts?.selectionChanged?.();
    });
    manual.append(head, idInput, select, add);
    const additional = [...state.selected.values()].filter((item) =>
      item.platform === platform.id && !(match.items || []).some((row) => String(row.id) === item.id));
    for (const target of additional) {
      const row = document.createElement("div");
      row.className = "article-match-row";
      const caption = document.createElement("span");
      caption.textContent = `已选择：${target.state === "draft" ? "草稿" : "已发布"} · ID ${target.id}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary compact";
      remove.textContent = "移除目标";
      remove.addEventListener("click", () => {
        state.selected.delete(target.platform + ":" + target.id);
        render();
        root.BlogCTLDrafts?.selectionChanged?.();
      });
      row.append(caption, remove);
      manual.append(row);
    }
    section.append(manual);
    container.append(section);
  }

  function init() {
    if (state.initialized) return;
    detectButton = document.getElementById("refreshArticleMatches");
    message = document.getElementById("syncMessage");
    detectButton.addEventListener("click", () => refreshArticleMatches());
    document.addEventListener("blogctl:update-platform-selection", refreshToolbar);
    document.addEventListener("blogctl:detect-association", (event) => {
      if (!state.active || state.article !== event.detail?.article) return;
      refreshArticleMatches([event.detail?.platform]);
    });
    document.addEventListener("blogctl:article-selected", (event) => {
      const next = String(event.detail?.article || "");
      if (next === state.article) return;
      state.article = next;
      clearMatches();
    });
    state.initialized = true;
  }

  function activate() {
    state.active = true;
    const article = localStorage.getItem("blogctl.selectedArticle") || "";
    if (article !== state.article) {
      state.article = article;
      clearMatches();
    }
    refreshToolbar();
  }

  function deactivate() { state.active = false; }
  function refresh() { refreshToolbar(); }
  root.BlogCTLSync = {
    init, activate, deactivate, refresh, refreshArticleMatches,
    appendPlatformMatches, selectedTargets, clearMatches,
    isBindingBusy: () => state.pending.size > 0,
  };
})(globalThis);
