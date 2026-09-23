"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    records: [],
    articles: [],
    platforms: [],
    resolvingPending: new Set(),
    publishing: new Set(),
    focusTarget: null,
  };
  let queryInput, platformSelect, statusSelect, summary, list, message;

  const labelForPlatform = (id) => state.platforms.find((item) => item.id === id)?.label || id;
  const titleForArticle = (slug) => state.articles.find((item) => item.slug === slug)?.title || slug;

  const platformProfile = (id) => state.platforms.find((item) => item.id === id) || {};
  const recordKey = (record) => `${record.article}\u0000${record.platform}`;

  function pendingFieldLabel(field) {
    switch (field) {
      case "canonical": return "Canonical";
      case "tags": return "Tags";
      case "coverImage": return "封面图";
      default: return field;
    }
  }

  function recordState(record) {
    return record.publishedUrl ? "published" : "draft";
  }

  function filteredRecords() {
    const query = queryInput.value.trim().toLowerCase();
    const platform = platformSelect.value;
    const status = statusSelect.value;
    return state.records.filter((record) => {
      if (platform && record.platform !== platform) return false;
      if (status === "pending" && (record.pendingFields ?? []).length === 0) return false;
      if (status && status !== "pending" && recordState(record) !== status) return false;
      if (!query) return true;
      const haystack = [
        record.article,
        titleForArticle(record.article),
        record.platform,
        labelForPlatform(record.platform),
        record.remoteId,
        ...(record.pendingFields ?? []).map(pendingFieldLabel),
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  function appendLink(container, label, href) {
    if (!href) return;
    const link = document.createElement("a");
    link.className = "secondary compact publication-action";
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = label;
    container.append(link);
  }

  async function resolvePending(record) {
    const key = recordKey(record);
    if (state.resolvingPending.has(key)) return;
    state.resolvingPending.add(key);
    render();
    BlogCTLPopup.setMessage(message, "正在更新本地待办状态…");
    try {
      const response = await BlogCTLPopup.send("blogctl.publication.pending.resolve", {
        article: record.article,
        platform: record.platform,
        fields: [],
      });
      record.pendingFields = response.pendingFields ?? [];
      BlogCTLPopup.setMessage(message, "已清除本地待办标记；此操作不会修改远端平台。", "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, `更新待办状态失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    } finally {
      state.resolvingPending.delete(key);
      render();
    }
  }

  function canPublish(record) {
    return !record.publishedUrl
      && Boolean(record.remoteId)
      && platformProfile(record.platform).capabilities?.explicitPublish === true;
  }

  async function publishRecord(record) {
    const key = recordKey(record);
    if (state.publishing.has(key)) return;
    state.publishing.add(key);
    render();
    BlogCTLPopup.setMessage(message, `正在发布 ${labelForPlatform(record.platform)} 草稿…`);
    try {
      const response = await BlogCTLPopup.send("blogctl.job.start", {
        request: {
          article: record.article,
          platforms: [record.platform],
          dryRun: false,
          usePlatformChangedOnly: false,
          draft: false,
          operation: "publish",
        },
      });
      BlogCTLPopup.setMessage(message, `发布任务 ${response.job?.id || ""} 已启动，可在“任务”页查看进度。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, `发布失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    } finally {
      state.publishing.delete(key);
      render();
    }
  }

  function render() {
    const records = filteredRecords();
    let focusedCard = null;
    const drafts = state.records.filter((record) => !record.publishedUrl && record.draftUrl).length;
    const published = state.records.filter((record) => Boolean(record.publishedUrl)).length;
    const pending = state.records.filter((record) => (record.pendingFields ?? []).length > 0).length;
    summary.textContent = `共 ${state.records.length} 条平台记录 · 草稿 ${drafts} · 已发布 ${published} · 待手动处理 ${pending} · 当前显示 ${records.length}`;
    list.replaceChildren();

    if (!records.length) {
      list.innerHTML = '<div class="platform-loading">没有匹配的草稿或发布记录</div>';
      return;
    }

    for (const record of records) {
      const card = document.createElement("div");
      card.className = "publication-item";
      card.tabIndex = -1;
      card.dataset.article = record.article;
      card.dataset.platform = record.platform;
      if (state.focusTarget?.article === record.article && state.focusTarget?.platform === record.platform) {
        card.classList.add("publication-item-highlight");
        focusedCard = card;
      }

      const head = document.createElement("div");
      head.className = "job-platform-main";
      const title = document.createElement("strong");
      title.textContent = titleForArticle(record.article);
      const status = document.createElement("span");
      BlogCTLPopup.setStatus(status, record.publishedUrl ? "ok" : "unknown", record.publishedUrl ? "已发布" : "草稿");
      head.append(title, status);
      card.append(head);

      const meta = document.createElement("div");
      meta.className = "job-meta";
      meta.textContent = [labelForPlatform(record.platform), record.article, record.remoteId ? `ID ${record.remoteId}` : ""].filter(Boolean).join(" · ");
      card.append(meta);

      const links = document.createElement("div");
      links.className = "publication-links";
      appendLink(links, "打开草稿", record.draftUrl);
      appendLink(links, "打开已发布文章", record.publishedUrl);

      const key = recordKey(record);
      if (canPublish(record)) {
        const publish = document.createElement("button");
        publish.type = "button";
        publish.className = "primary inline-primary compact publication-action";
        publish.textContent = "发布";
        publish.disabled = state.publishing.has(key);
        publish.addEventListener("click", () => publishRecord(record));
        links.append(publish);
      }
      if (links.childElementCount) card.append(links);

      if ((record.pendingFields ?? []).length > 0) {
        const pendingRow = document.createElement("div");
        pendingRow.className = "job-platform-main";
        const pending = document.createElement("small");
        pending.className = "job-platform-message";
        pending.textContent = `待手动设置：${record.pendingFields.map(pendingFieldLabel).join("、")}`;
        const resolve = document.createElement("button");
        resolve.type = "button";
        resolve.className = "secondary compact";
        resolve.textContent = "标记已处理";
        resolve.title = "只清除 BlogCTL 本地待办标记，不会修改远端平台";
        resolve.disabled = state.resolvingPending.has(key);
        resolve.addEventListener("click", () => resolvePending(record));
        pendingRow.append(pending, resolve);
        card.append(pendingRow);
      }

      const updated = record.updatedAt || record.publishedSyncedAt || record.publishedAt || record.draftSyncedAt;
      if (updated) {
        const time = document.createElement("small");
        time.className = "job-platform-message";
        time.textContent = `最近同步 ${BlogCTLPopup.formatTime(updated)}`;
        card.append(time);
      }
      list.append(card);
    }

    if (focusedCard) {
      state.focusTarget = null;
      requestAnimationFrame(() => {
        focusedCard.scrollIntoView({ behavior: "smooth", block: "center" });
        focusedCard.focus({ preventScroll: true });
        setTimeout(() => focusedCard.classList.remove("publication-item-highlight"), 2200);
      });
    }
  }

  function renderPlatformOptions() {
    const previous = platformSelect.value;
    platformSelect.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "全部平台";
    platformSelect.append(all);
    const ids = [...new Set(state.records.map((record) => record.platform))].sort();
    for (const id of ids) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = labelForPlatform(id);
      platformSelect.append(option);
    }
    if (ids.includes(previous)) platformSelect.value = previous;
  }

  function applyFocusFilters() {
    if (!state.focusTarget) return;
    queryInput.value = state.focusTarget.article;
    statusSelect.value = "";
    const hasPlatform = [...platformSelect.options].some((option) => option.value === state.focusTarget.platform);
    platformSelect.value = hasPlatform ? state.focusTarget.platform : "";
  }

  function focusRecord(article, platform) {
    state.focusTarget = {
      article: String(article || "").trim(),
      platform: String(platform || "").trim(),
    };
    if (!state.focusTarget.article || !state.focusTarget.platform) {
      state.focusTarget = null;
      return;
    }
    if (state.active && state.records.length) {
      applyFocusFilters();
      render();
    }
  }

  async function refresh() {
    if (!state.active) return;
    BlogCTLPopup.setMessage(message);
    try {
      const [publications, articles, publishing] = await Promise.all([
        BlogCTLPopup.send("blogctl.publications"),
        BlogCTLPopup.send("blogctl.articles"),
        BlogCTLPopup.send("blogctl.publishing"),
      ]);
      state.records = publications.records ?? [];
      state.articles = articles.articles ?? [];
      state.platforms = publishing.platforms ?? [];
      state.resolvingPending.clear();
      state.publishing.clear();
      renderPlatformOptions();
      applyFocusFilters();
      render();
      await BlogCTLPopup.refreshBridgeIndicator();
    } catch (error) {
      BlogCTLPopup.setMessage(message, `读取草稿与发布记录失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    }
  }

  function init() {
    if (state.initialized) return;
    queryInput = document.getElementById("publicationQuery");
    platformSelect = document.getElementById("publicationPlatform");
    statusSelect = document.getElementById("publicationStatus");
    summary = document.getElementById("publicationSummary");
    list = document.getElementById("publicationList");
    message = document.getElementById("publicationsMessage");
    queryInput.addEventListener("input", render);
    platformSelect.addEventListener("change", render);
    statusSelect.addEventListener("change", render);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }

  root.BlogCTLPublications = { init, activate, deactivate, refresh, focusRecord };
})(globalThis);
