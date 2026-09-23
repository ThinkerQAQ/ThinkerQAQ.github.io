"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    records: [],
    articles: [],
    platforms: [],
    selectedKeys: new Set(),
    resolvingPending: new Set(),
    prepared: null,
    focusTarget: null,
    currentJob: null,
    pollTimer: null,
  };

  let queryInput, platformSelect, statusSelect, summary, list, publishButton, runStatus, message;

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

  function hasDraft(record) {
    return Boolean(record.remoteId || record.draftUrl);
  }

  function hasPublished(record) {
    return Boolean(record.publishedUrl);
  }

  function canPublish(record) {
    return hasDraft(record) && platformProfile(record.platform).capabilities?.explicitPublish === true;
  }

  function matchesStatus(record, status) {
    if (!status) return true;
    if (status === "pending") return (record.pendingFields ?? []).length > 0;
    if (status === "draft") return hasDraft(record);
    if (status === "published") return hasPublished(record);
    return true;
  }

  function filteredRecords() {
    const query = queryInput.value.trim().toLowerCase();
    const platform = platformSelect.value;
    const status = statusSelect.value;

    return state.records.filter((record) => {
      if (platform && record.platform !== platform) return false;
      if (!matchesStatus(record, status)) return false;
      if (!query) return true;
      const haystack = [
        record.article,
        titleForArticle(record.article),
        record.platform,
        labelForPlatform(record.platform),
        record.remoteId,
        record.publishedRemoteId,
        ...(record.pendingFields ?? []).map(pendingFieldLabel),
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  function selectedRecords() {
    return state.records.filter((record) => state.selectedKeys.has(recordKey(record)) && canPublish(record));
  }

  function selectedArticle() {
    return selectedRecords()[0]?.article || "";
  }

  function updatePublishButton() {
    const selected = selectedRecords();
    const running = ["queued", "running"].includes(state.currentJob?.state);
    publishButton.disabled = selected.length === 0 || running;
    publishButton.textContent = selected.length > 0 ? `发布 ${selected.length} 个平台` : "发布所选";
  }

  function appendActionLink(container, label, href, primary = false) {
    if (!href) return;
    const link = document.createElement("a");
    link.className = `${primary ? "primary inline-primary" : "secondary"} compact publication-action`;
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = label;
    container.append(link);
  }

  function selectRecord(record, selected) {
    const key = recordKey(record);
    if (!selected) {
      state.selectedKeys.delete(key);
      render();
      return;
    }

    const currentArticle = selectedArticle();
    if (currentArticle && currentArticle !== record.article) {
      state.selectedKeys.clear();
    }
    state.selectedKeys.add(key);
    render();
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

  function taskLink(label, jobID) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary compact";
    button.textContent = label;
    button.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("blogctl:navigate-task", { detail: { jobId: jobID } }));
    });
    return button;
  }

  function publishedURLFor(platform, job) {
    const resultURL = job?.results?.[platform]?.url;
    if (resultURL) return resultURL;
    return state.records.find((record) => record.article === job?.article && record.platform === platform)?.publishedUrl || "";
  }

  function renderRunStatus() {
    const job = state.currentJob;
    runStatus.replaceChildren();
    runStatus.hidden = !job;
    if (!job) return;

    const head = document.createElement("div");
    head.className = "workflow-status-head";
    const title = document.createElement("strong");
    title.textContent = `发布任务 ${job.id}`;
    const badge = document.createElement("span");
    const presentation = BlogCTLSyncModel.statePresentation(job.state);
    BlogCTLPopup.setStatus(badge, presentation.kind, presentation.label);
    head.append(title, badge);
    runStatus.append(head);

    if (job.state === "failed") {
      const detail = document.createElement("small");
      detail.className = "job-platform-message error-text";
      detail.textContent = job.error || "发布失败";
      runStatus.append(detail);

      const actions = document.createElement("div");
      actions.className = "workflow-status-actions";
      actions.append(taskLink("查看失败任务", job.id));
      runStatus.append(actions);
      return;
    }

    if (job.state === "completed") {
      const detail = document.createElement("small");
      detail.className = "job-platform-message";
      detail.textContent = "发布完成。";
      runStatus.append(detail);

      const actions = document.createElement("div");
      actions.className = "workflow-status-actions";
      for (const platform of job.platforms ?? []) {
        const url = publishedURLFor(platform, job);
        appendActionLink(actions, `查看${labelForPlatform(platform)}文章`, url, true);
      }
      runStatus.append(actions);
      return;
    }

    const detail = document.createElement("small");
    detail.className = "job-platform-message";
    detail.textContent = "正在发布并轮询任务状态…";
    runStatus.append(detail);
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
  }

  async function pollJob(jobID) {
    stopPolling();
    if (!jobID || state.currentJob?.id !== jobID) return;

    try {
      const response = await BlogCTLPopup.send("blogctl.job.get", { id: jobID });
      if (state.currentJob?.id !== jobID) return;
      state.currentJob = response.job ?? state.currentJob;

      if (state.currentJob.state === "completed") {
        const publications = await BlogCTLPopup.send("blogctl.publications");
        state.records = publications.records ?? state.records;
        state.selectedKeys.clear();
        renderPlatformOptions();
        render();
        renderRunStatus();
        updatePublishButton();
        return;
      }

      renderRunStatus();
      updatePublishButton();
      if (state.currentJob.state === "failed") return;
    } catch (error) {
      BlogCTLPopup.setMessage(message, `任务状态读取失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    }

    state.pollTimer = setTimeout(() => pollJob(jobID), 1200);
  }

  async function startPublish() {
    const records = selectedRecords();
    if (!records.length || publishButton.disabled) return;

    const article = records[0].article;
    if (records.some((record) => record.article !== article)) {
      BlogCTLPopup.setMessage(message, "一次发布任务只能处理同一篇文章。", "error");
      return;
    }

    const platforms = records.map((record) => record.platform);
    publishButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在创建发布任务…");

    try {
      const response = await BlogCTLPopup.send("blogctl.job.start", {
        request: {
          article,
          platforms,
          dryRun: false,
          usePlatformChangedOnly: false,
          draft: false,
          operation: "publish",
        },
      });
      state.currentJob = response.job ?? null;
      renderRunStatus();
      BlogCTLPopup.setMessage(message, "发布任务已启动，正在轮询状态。", "ok");
      if (state.currentJob?.id) pollJob(state.currentJob.id);
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      updatePublishButton();
    }
  }

  function render() {
    const records = filteredRecords();
    const draftCount = state.records.filter(hasDraft).length;
    const publishedCount = state.records.filter(hasPublished).length;
    const pendingCount = state.records.filter((record) => (record.pendingFields ?? []).length > 0).length;
    summary.textContent = `共 ${state.records.length} 条平台记录 · 可发布草稿 ${draftCount} · 已发布 ${publishedCount} · 待手动处理 ${pendingCount} · 当前显示 ${records.length}`;

    let focusedCard = null;
    list.replaceChildren();

    if (!records.length) {
      list.innerHTML = '<div class="platform-loading">没有匹配的发布记录</div>';
      updatePublishButton();
      return;
    }

    const selectedArticleSlug = selectedArticle();

    for (const record of records) {
      const key = recordKey(record);
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

      const titleWrap = document.createElement("div");
      titleWrap.className = "publication-title";
      if (canPublish(record)) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = state.selectedKeys.has(key);
        checkbox.disabled = Boolean(selectedArticleSlug && selectedArticleSlug !== record.article);
        checkbox.addEventListener("change", () => selectRecord(record, checkbox.checked));
        titleWrap.append(checkbox);
      }

      const title = document.createElement("strong");
      title.textContent = titleForArticle(record.article);
      titleWrap.append(title);

      const status = document.createElement("span");
      if (hasDraft(record)) BlogCTLPopup.setStatus(status, "unknown", "待发布");
      else if (hasPublished(record)) BlogCTLPopup.setStatus(status, "ok", "已发布");
      else BlogCTLPopup.setStatus(status, "disabled", "无远端记录");

      head.append(titleWrap, status);
      card.append(head);

      const meta = document.createElement("div");
      meta.className = "job-meta";
      meta.textContent = [
        labelForPlatform(record.platform),
        record.article,
        record.remoteId ? `草稿 ID ${record.remoteId}` : "",
        record.publishedRemoteId ? `文章 ID ${record.publishedRemoteId}` : "",
      ].filter(Boolean).join(" · ");
      card.append(meta);

      const actions = document.createElement("div");
      actions.className = "publication-links";
      if (record.draftUrl) appendActionLink(actions, "打开草稿", record.draftUrl);
      if (record.publishedUrl) appendActionLink(actions, "查看文章", record.publishedUrl, true);
      if (actions.childElementCount) card.append(actions);

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

    updatePublishButton();

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

  function applyPrepared() {
    if (!state.prepared) return;

    queryInput.value = state.prepared.article;
    statusSelect.value = "draft";
    platformSelect.value = state.prepared.platforms.length === 1 &&
      [...platformSelect.options].some((option) => option.value === state.prepared.platforms[0])
      ? state.prepared.platforms[0]
      : "";

    state.selectedKeys.clear();
    for (const platform of state.prepared.platforms) {
      const record = state.records.find((item) =>
        item.article === state.prepared.article && item.platform === platform && canPublish(item));
      if (record) state.selectedKeys.add(recordKey(record));
    }
  }

  function prepare(article, platforms) {
    const cleanArticle = String(article || "").trim();
    const cleanPlatforms = [...new Set((platforms ?? []).map((item) => String(item || "").trim()).filter(Boolean))];
    if (!cleanArticle || !cleanPlatforms.length) return;

    state.prepared = { article: cleanArticle, platforms: cleanPlatforms };
    state.focusTarget = { article: cleanArticle, platform: cleanPlatforms[0] };

    if (state.active && state.records.length) {
      applyPrepared();
      render();
    }
  }

  function focusRecord(article, platform) {
    prepare(article, [platform]);
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

      renderPlatformOptions();
      applyPrepared();
      render();
      renderRunStatus();

      if (state.currentJob?.id && ["queued", "running"].includes(state.currentJob.state)) {
        pollJob(state.currentJob.id);
      }
      await BlogCTLPopup.refreshBridgeIndicator();
    } catch (error) {
      BlogCTLPopup.setMessage(message, `读取发布记录失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    }
  }

  function init() {
    if (state.initialized) return;

    queryInput = document.getElementById("publicationQuery");
    platformSelect = document.getElementById("publicationPlatform");
    statusSelect = document.getElementById("publicationStatus");
    summary = document.getElementById("publicationSummary");
    list = document.getElementById("publicationList");
    publishButton = document.getElementById("publishSelected");
    runStatus = document.getElementById("publicationRunStatus");
    message = document.getElementById("publicationsMessage");

    queryInput.addEventListener("input", render);
    platformSelect.addEventListener("change", render);
    statusSelect.addEventListener("change", render);
    publishButton.addEventListener("click", startPublish);

    state.initialized = true;
  }

  function activate() {
    state.active = true;
    refresh();
  }

  function deactivate() {
    state.active = false;
    stopPolling();
  }

  root.BlogCTLPublications = {
    init,
    activate,
    deactivate,
    refresh,
    prepare,
    focusRecord,
  };
})(globalThis);
