"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    articles: [],
    selectedSlug: "",
    preparedSlug: "",
    selectedPlatformIDs: new Set(BlogCTLSyncState.loadPlatforms(localStorage)),
    status: null,
    publishing: [],
    tools: [],
    records: [],
    currentJob: null,
    pollTimer: null,
  };

  let articlePicker, articleOptions, articleMeta, platformsContainer;
  let actionButton, nextActions, viewTaskButton, enterPublishButton, message;

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

  function stopPolling() {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function resetWorkflow() {
    if (["queued", "running"].includes(state.currentJob?.state)) return;
    state.currentJob = null;
    stopPolling();
    BlogCTLPopup.setMessage(message);
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
    resetWorkflow();
    state.selectedSlug = article.slug;
    state.preparedSlug = "";
    articlePicker.value = `${article.title} · ${article.slug}`;
    articleOptions.hidden = true;
    articlePicker.setAttribute("aria-expanded", "false");
    localStorage.setItem("blogctl.selectedArticle", article.slug);
    renderArticleMeta();
    renderPlatforms();
  }

  function platformLifecycleText(platformId) {
    const record = publicationRecord(platformId);
    if (record?.remoteId || record?.draftUrl) return "已有草稿关系 · 保存时更新";
    if (record?.publishedUrl) return "已有已发布记录 · 保存新的草稿版本";
    return "没有草稿关系 · 保存时创建";
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
    const running = ["queued", "running"].includes(state.currentJob?.state);
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
      checkbox.disabled = !availability.available || running;
      checkbox.addEventListener("change", () => {
        resetWorkflow();
        state.selectedPlatformIDs = new Set(selectedPlatforms());
        BlogCTLSyncState.savePlatforms(localStorage, state.selectedPlatformIDs);
        renderPlatforms();
      });

      const text = document.createElement("span");
      text.className = "platform-choice-text";
      const name = document.createElement("strong");
      name.textContent = platform.label || platform.id;
      const detail = document.createElement("small");
      detail.textContent = !availability.available ? availability.reason : platformLifecycleText(platform.id);
      text.append(name, detail);

      const badge = document.createElement("span");
      if (!availability.available) BlogCTLPopup.setStatus(badge, "disabled", availability.reason);
      else BlogCTLPopup.setStatus(badge, "ok", "可保存");

      card.append(checkbox, text, badge);
      wrapper.append(card);

      const taskResult = platformTaskResult(platform.id);
      if (taskResult) {
        const statusRow = document.createElement("div");
        statusRow.className = "platform-task-status";

        const statusLabel = document.createElement("span");
        statusLabel.textContent = "保存状态";
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

  function completedPlatforms(job) {
    return (job?.platforms ?? []).filter((platform) => job.results?.[platform]?.state === "completed");
  }

  function updateAction() {
    const count = selectedPlatforms().length;
    const job = state.currentJob;
    const running = ["queued", "running"].includes(job?.state);
    const terminal = ["completed", "failed"].includes(job?.state);
    const ready = Boolean(state.selectedSlug) && count > 0 && Boolean(state.status?.bridge?.running);

    actionButton.hidden = terminal;
    nextActions.hidden = !terminal;

    if (!terminal) {
      actionButton.disabled = !ready || running;
      actionButton.textContent = running
        ? "保存中…"
        : count > 0 ? `保存 ${count} 个平台` : "保存";
    }

    if (terminal) {
      const successful = completedPlatforms(job);
      viewTaskButton.disabled = false;
      enterPublishButton.disabled = successful.length === 0;
      enterPublishButton.textContent = successful.length > 0 && successful.length < (job.platforms ?? []).length
        ? `发布成功的 ${successful.length} 个平台`
        : "进入发布";
    }
  }

  function navigateTask() {
    if (!state.currentJob?.id) return;
    document.dispatchEvent(new CustomEvent("blogctl:navigate-task", {
      detail: { jobId: state.currentJob.id },
    }));
  }

  function enterPublish() {
    const job = state.currentJob;
    if (!job) return;
    const platforms = completedPlatforms(job);
    if (!platforms.length) return;

    document.dispatchEvent(new CustomEvent("blogctl:draft-completed", {
      detail: {
        article: job.article,
        platforms,
        jobId: job.id,
      },
    }));
  }

  async function pollJob(jobID) {
    stopPolling();
    if (!jobID || state.currentJob?.id !== jobID) return;

    try {
      const response = await BlogCTLPopup.send("blogctl.job.get", { id: jobID });
      if (state.currentJob?.id !== jobID) return;
      state.currentJob = response.job ?? state.currentJob;
      renderPlatforms();
      updateAction();

      if (state.currentJob.state === "completed") {
        BlogCTLPopup.setMessage(message, "保存完成。可查看任务，或进入发布。", "ok");
        return;
      }
      if (state.currentJob.state === "failed") {
        const successful = completedPlatforms(state.currentJob).length;
        BlogCTLPopup.setMessage(
          message,
          successful > 0
            ? `部分平台保存失败；${successful} 个平台可继续发布。`
            : "保存失败，请查看任务详情。",
          "error",
        );
        return;
      }
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
    BlogCTLPopup.setMessage(message, "正在创建保存任务…");
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
      updateAction();
      BlogCTLPopup.setMessage(message, "保存任务已启动，正在轮询状态。", "ok");
      if (state.currentJob?.id) pollJob(state.currentJob.id);
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      updateAction();
    }
  }

  function prepare(article) {
    const slug = String(article || "").trim();
    if (!slug) return;
    resetWorkflow();
    state.preparedSlug = slug;
    state.selectedSlug = slug;
    localStorage.setItem("blogctl.selectedArticle", slug);

    if (state.active && state.articles.length) {
      const selected = selectedArticle();
      articlePicker.value = selected ? `${selected.title} · ${selected.slug}` : slug;
      renderArticles();
      renderPlatforms();
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

      const previous = state.preparedSlug || state.selectedSlug || localStorage.getItem("blogctl.selectedArticle") || "";
      if (state.articles.some((item) => item.slug === previous)) {
        state.selectedSlug = previous;
        state.preparedSlug = "";
        const selected = selectedArticle();
        articlePicker.value = `${selected.title} · ${selected.slug}`;
      } else {
        state.selectedSlug = "";
      }

      renderArticles();
      renderPlatforms();
      if (state.currentJob?.id && ["queued", "running"].includes(state.currentJob.state)) {
        pollJob(state.currentJob.id);
      }
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
    nextActions = document.getElementById("draftNextActions");
    viewTaskButton = document.getElementById("draftViewTask");
    enterPublishButton = document.getElementById("draftEnterPublish");
    message = document.getElementById("draftsMessage");

    articlePicker.addEventListener("focus", () => {
      articleOptions.hidden = false;
      renderArticles();
    });
    articlePicker.addEventListener("input", () => {
      resetWorkflow();
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
    viewTaskButton.addEventListener("click", navigateTask);
    enterPublishButton.addEventListener("click", enterPublish);
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

  root.BlogCTLDrafts = { init, activate, deactivate, refresh, prepare };
})(globalThis);
