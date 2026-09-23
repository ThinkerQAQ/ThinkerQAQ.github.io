"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    articles: [],
    selectedSlug: "",
    selectedPlatformIDs: new Set(BlogCTLSyncState.loadPlatforms(localStorage)),
    status: null,
    publishing: [],
    tools: [],
    records: [],
    currentJob: null,
    pollTimer: null,
  };

  let articlePicker, articleOptions, articleMeta, platformsContainer, actionButton, runStatus, message;

  function selectedArticle() {
    return state.articles.find((item) => item.slug === state.selectedSlug);
  }

  function publishingProfile(platformId) {
    return state.publishing.find((item) => item.id === platformId) ?? {};
  }

  function selectedPlatforms() {
    return [...platformsContainer.querySelectorAll('input[type="checkbox"][data-platform]:checked')]
      .filter((input) => !input.disabled)
      .map((input) => input.dataset.platform);
  }

  function publicationRecord(platform) {
    return state.records.find((record) => record.article === state.selectedSlug && record.platform === platform);
  }

  function platformAvailability(article, platform) {
    const sourceAvailability = BlogCTLSyncModel.platformAvailability(article, platform, publishingProfile(platform.id));
    const toolAvailability = BlogCTLSyncModel.deliveryToolAvailability(platform, state.tools);
    return sourceAvailability.available ? toolAvailability : sourceAvailability;
  }

  function renderArticleMeta() {
    const article = selectedArticle();
    articleMeta.textContent = article ? `${article.title} · ${article.slug}` : "";
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
    updateAction();
  }

  function selectArticle(article) {
    state.selectedSlug = article.slug;
    articlePicker.value = `${article.title} · ${article.slug}`;
    articleOptions.hidden = true;
    articlePicker.setAttribute("aria-expanded", "false");
    localStorage.setItem("blogctl.selectedArticle", article.slug);
    renderArticleMeta();
    renderPlatforms();
  }

  function platformLifecycleText(platformId) {
    const record = publicationRecord(platformId);
    if (record?.remoteId || record?.draftUrl) return "已有草稿关系 · 本次更新";
    if (record?.publishedUrl) return "已有已发布记录 · 本次保存新的草稿版本";
    return "没有草稿关系 · 本次创建";
  }

  function platformTaskResult(platformId) {
    if (!state.currentJob || !(state.currentJob.platforms ?? []).includes(platformId)) return null;
    return state.currentJob.results?.[platformId] ?? { state: state.currentJob.state || "queued" };
  }

  function renderPlatforms() {
    const previous = platformsContainer.querySelector('input[data-platform]')
      ? new Set(selectedPlatforms())
      : state.selectedPlatformIDs;
    const article = selectedArticle();
    platformsContainer.replaceChildren();

    for (const platform of state.status?.platforms ?? []) {
      const availability = platformAvailability(article, platform);
      const wrapper = document.createElement("div");
      wrapper.className = "platform-choice-card";

      const card = document.createElement("label");
      card.className = "platform-choice";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.platform = platform.id;
      checkbox.checked = previous.has(platform.id) && availability.available;
      checkbox.disabled = !availability.available || ["queued", "running"].includes(state.currentJob?.state);
      checkbox.addEventListener("change", () => {
        state.selectedPlatformIDs = new Set(selectedPlatforms());
        BlogCTLSyncState.savePlatforms(localStorage, state.selectedPlatformIDs);
        updateAction();
      });

      const text = document.createElement("span");
      text.className = "platform-choice-text";
      const name = document.createElement("strong");
      name.textContent = platform.label || platform.id;
      const detail = document.createElement("small");
      detail.textContent = !availability.available
        ? availability.reason
        : platformLifecycleText(platform.id);
      text.append(name, detail);

      const badge = document.createElement("span");
      if (!availability.available) BlogCTLPopup.setStatus(badge, "disabled", availability.reason);
      else BlogCTLPopup.setStatus(badge, "ok", publicationRecord(platform.id)?.remoteId ? "更新" : "创建");

      card.append(checkbox, text, badge);
      wrapper.append(card);

      const taskResult = platformTaskResult(platform.id);
      if (taskResult) {
        const statusRow = document.createElement("div");
        statusRow.className = "platform-task-status";
        const statusLabel = document.createElement("span");
        statusLabel.textContent = "任务状态";
        const status = document.createElement("strong");
        const presentation = BlogCTLSyncModel.statePresentation(taskResult.state, taskResult.result || "");
        BlogCTLPopup.setStatus(status, presentation.kind, presentation.label);
        statusRow.append(statusLabel, status);

        const detailText = taskResult.error || taskResult.message;
        if (detailText) {
          const taskDetail = document.createElement("small");
          taskDetail.className = taskResult.error ? "job-platform-message error-text" : "job-platform-message";
          taskDetail.textContent = detailText;
          statusRow.append(taskDetail);
        }
        wrapper.append(statusRow);
      }

      platformsContainer.append(wrapper);
    }

    if (!platformsContainer.childElementCount) {
      platformsContainer.innerHTML = '<div class="platform-loading">没有可用平台</div>';
    }
    updateAction();
  }

  function updateAction() {
    const count = selectedPlatforms().length;
    const running = state.currentJob?.state === "queued" || state.currentJob?.state === "running";
    const ready = Boolean(state.selectedSlug) && count > 0 && Boolean(state.status?.bridge?.running);
    actionButton.disabled = !ready || running;
    actionButton.textContent = count > 0 ? `更新／保存 ${count} 个平台` : "更新／保存";
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

  function completedPlatforms(job) {
    return (job.platforms ?? []).filter((platform) => job.results?.[platform]?.state === "completed");
  }

  function publishLink(job) {
    const platforms = completedPlatforms(job);
    if (!platforms.length) return null;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary inline-primary compact";
    button.textContent = platforms.length === (job.platforms ?? []).length
      ? "进入发布"
      : `发布成功的 ${platforms.length} 个平台`;
    button.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("blogctl:draft-completed", {
        detail: {
          article: job.article,
          platforms,
          jobId: job.id,
        },
      }));
    });
    return button;
  }

  function renderRunStatus() {
    const job = state.currentJob;
    runStatus.replaceChildren();
    runStatus.hidden = !job;
    if (!job) return;

    const head = document.createElement("div");
    head.className = "workflow-status-head";
    const label = document.createElement("strong");
    label.textContent = `任务 ${job.id}`;
    const status = document.createElement("span");
    const presentation = BlogCTLSyncModel.statePresentation(job.state);
    BlogCTLPopup.setStatus(status, presentation.kind, presentation.label);
    head.append(label, status);
    runStatus.append(head);

    const detail = document.createElement("small");
    detail.className = job.state === "failed" ? "job-platform-message error-text" : "job-platform-message";
    detail.textContent = job.state === "failed"
      ? (job.error || "更新／保存存在失败平台")
      : job.state === "completed"
        ? "更新／保存完成。可查看任务详情，或手动进入发布。"
        : "正在更新远端草稿状态…";
    runStatus.append(detail);

    if (["completed", "failed"].includes(job.state)) {
      const actions = document.createElement("div");
      actions.className = "workflow-status-actions";
      actions.append(taskLink("查看任务", job.id));
      const publish = publishLink(job);
      if (publish) actions.append(publish);
      runStatus.append(actions);
    }
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
      renderPlatforms();
      renderRunStatus();
      updateAction();

      if (["completed", "failed"].includes(state.currentJob.state)) return;
    } catch (error) {
      BlogCTLPopup.setMessage(message, `任务状态读取失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    }

    state.pollTimer = setTimeout(() => pollJob(jobID), 1200);
  }

  async function startSave() {
    const article = state.selectedSlug;
    const platforms = selectedPlatforms();
    if (!article || !platforms.length || actionButton.disabled) return;

    actionButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在创建更新／保存任务…");
    try {
      const response = await BlogCTLPopup.send("blogctl.job.start", {
        request: {
          article,
          platforms,
          dryRun: false,
          usePlatformChangedOnly: true,
          draft: true,
          operation: "draft",
        },
      });
      state.currentJob = response.job ?? null;
      renderPlatforms();
      renderRunStatus();
      BlogCTLPopup.setMessage(message, "任务已启动，正在轮询状态。", "ok");
      if (state.currentJob?.id) pollJob(state.currentJob.id);
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      updateAction();
    }
  }

  async function refresh() {
    if (!state.active) return;
    BlogCTLPopup.setMessage(message);
    try {
      const [articlesResponse, statusResponse, publishingResponse, toolsResponse, publicationsResponse] = await Promise.all([
        BlogCTLPopup.send("blogctl.articles"),
        BlogCTLPopup.send("blogctl.status"),
        BlogCTLPopup.send("blogctl.publishing"),
        BlogCTLPopup.send("blogctl.tools"),
        BlogCTLPopup.send("blogctl.publications"),
      ]);

      state.articles = articlesResponse.articles ?? [];
      state.status = statusResponse.status;
      state.publishing = publishingResponse.platforms ?? [];
      state.tools = toolsResponse.tools ?? [];
      state.records = publicationsResponse.records ?? [];

      const previous = state.selectedSlug || localStorage.getItem("blogctl.selectedArticle") || "";
      if (state.articles.some((item) => item.slug === previous)) {
        state.selectedSlug = previous;
        const selected = selectedArticle();
        articlePicker.value = `${selected.title} · ${selected.slug}`;
      } else {
        state.selectedSlug = "";
      }

      renderArticles();
      renderPlatforms();
      renderRunStatus();
      if (state.currentJob?.id && ["queued", "running"].includes(state.currentJob.state)) pollJob(state.currentJob.id);
      BlogCTLPopup.refreshBridgeIndicator(state.status).catch(() => {});
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      updateAction();
    }
  }

  function init() {
    if (state.initialized) return;

    articlePicker = document.getElementById("draftArticlePicker");
    articleOptions = document.getElementById("draftArticleOptions");
    articleMeta = document.getElementById("draftArticleMeta");
    platformsContainer = document.getElementById("draftPlatforms");
    actionButton = document.getElementById("saveDrafts");
    runStatus = document.getElementById("draftRunStatus");
    message = document.getElementById("draftsMessage");

    articlePicker.addEventListener("focus", () => {
      articleOptions.hidden = false;
      renderArticles();
    });
    articlePicker.addEventListener("input", () => {
      state.selectedSlug = "";
      articleOptions.hidden = false;
      renderArticles();
      renderPlatforms();
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

    actionButton.addEventListener("click", startSave);
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

  root.BlogCTLDrafts = { init, activate, deactivate, refresh };
})(globalThis);
