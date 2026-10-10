"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    articles: [],
    selectedSlug: "",
    preparedSlug: "",
    selectedPlatformIDs: new Set(BlogCTLSyncModel.visiblePlatformIDs(BlogCTLSyncState.loadPlatforms(localStorage))),
    status: null,
    publishing: [],
    tools: [],
    records: [],
    currentJob: null,
    pollTimer: null,
    bindingMutating: false,
  };

  let articlePicker, articleOptions, articleMeta, platformsContainer;
  let actionButton, nextActions, viewTaskButton, enterPublishButton, message, selectAllButton, invertButton;

  function selectedArticle() {
    return state.articles.find((item) => item.slug === state.selectedSlug);
  }

  function publishingProfile(platformId) {
    return state.publishing.find((item) => item.id === platformId) ?? {};
  }

  function platformSelection() {
    return [...platformsContainer.querySelectorAll('input[type="checkbox"][data-platform]:checked')]
      .map((input) => input.dataset.platform)
      .filter((id) => BlogCTLSyncModel.isVisiblePlatform(id));
  }

  async function refreshBindings() {
    const response = await BlogCTLPopup.send("blogctl.publications");
    state.records = response.records ?? [];
    if (state.active) renderPlatforms();
  }

  function selectedPlatforms() {
    return [...platformsContainer.querySelectorAll('input[type="checkbox"][data-platform]:checked')]
      .filter((input) => !input.disabled && BlogCTLSyncModel.isVisiblePlatform(input.dataset.platform))
      .map((input) => input.dataset.platform);
  }

  function publicationRecord(platform) {
    return state.records.find((record) => record.article === state.selectedSlug && record.platform === platform);
  }

  function platformAvailability(article, platform) {
    if (platform.id === "toutiao" && platform.capabilities?.draftCreate !== true) {
      return { available: false, reason: "仅支持文章查询与关联；头条纯接口保存暂不可用" };
    }
    const sourceAvailability = BlogCTLSyncModel.platformAvailability(article, platform, publishingProfile(platform.id));
    if (!sourceAvailability.available) return sourceAvailability;
    const toolAvailability = BlogCTLSyncModel.deliveryToolAvailability(platform, state.tools);
    if (!toolAvailability.available) return toolAvailability;

    const record = publicationRecord(platform.id);
    const hasDraft = Boolean(record?.remoteId || record?.draftUrl);
    const hasPublished = Boolean(record?.publishedRemoteId || record?.publishedUrl);
    // An already-published Toutiao article is edited only via the separate
    // explicit republish action, never through the ordinary draft save path.
    if (platform.id === "toutiao" && !hasDraft && hasPublished) {
      return { available: false, reason: "已发布文章请使用「更新已发布」" };
    }
    if (!hasDraft && hasPublished && platform.capabilities?.publishedUpdate !== true &&
      platform.capabilities?.publishedDraftEdit !== true) {
      return { available: false, reason: "已有已发布文章；该平台暂不支持原文更新" };
    }
    return { available: true, reason: "" };
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

  function setArticleOptionsOpen(open) {
    articleOptions.hidden = !open;
    articlePicker.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function renderArticles() {
    const query = articlePicker.value.trim().toLowerCase();
    const filtered = state.articles.filter((article) => !query || `${article.title} · ${article.slug}`.toLowerCase().includes(query));
    articleOptions.replaceChildren();

    for (const article of filtered) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "article-option";
      if (article.slug === state.selectedSlug) option.classList.add("active");
      option.setAttribute("role", "option");
      option.textContent = `${article.title} · ${article.slug}`;
      option.addEventListener("click", () => selectArticle(article));
      articleOptions.append(option);
    }

    if (!filtered.length) articleOptions.textContent = "没有匹配文章";
    setArticleOptionsOpen(true);
    renderArticleMeta();
    updateAction();
  }

  function selectArticle(article) {
    resetWorkflow();
    state.selectedSlug = article.slug;
    state.preparedSlug = "";
    articlePicker.value = `${article.title} · ${article.slug}`;
    setArticleOptionsOpen(false);
    localStorage.setItem("blogctl.selectedArticle", article.slug);
    document.dispatchEvent(new CustomEvent("blogctl:article-selected", {
      detail: { article: article.slug },
    }));
    renderArticleMeta();
    renderPlatforms();
  }

  function platformLifecycleText(platformId) {
    const record = publicationRecord(platformId);
    if (record?.remoteId || record?.draftUrl) return "已有草稿关系 · 本次更新";
    if (record?.publishedUrl) return "已有已发布记录";
    return "没有草稿关系 · 本次创建";
  }

  // The Bridge already supports state-specific local unbinding for all
  // visible delivery platforms. Never delete the remote post itself.
  async function unbindPlatformRecord(platformID, stateName, postID) {
    const article = state.selectedSlug;
    const record = publicationRecord(platformID);
    const recordID = stateName === "draft" ? record?.remoteId : record?.publishedRemoteId;
    if (!article || !BlogCTLSyncModel.isVisiblePlatform(platformID) ||
        state.bindingMutating || !state.status?.bridge?.running ||
        ["queued", "running"].includes(state.currentJob?.state) ||
        !postID || String(recordID) !== String(postID)) return;

    const label = stateName === "draft" ? "草稿" : "已发布文章";
    if (!window.confirm(`仅解除 BlogCTL 对此平台${label}（ID ${postID}）的关联，不会删除远端内容。确定继续？`)) return;

    state.bindingMutating = true;
    renderPlatforms();
    try {
      await BlogCTLPopup.send("blogctl." + platformID + ".unbind", {
        article, state: stateName, postId: postID,
      });
      const response = await BlogCTLPopup.send("blogctl.publications");
      state.records = response.records ?? [];
      // Detection caches bound/unbound flags for 24h. Invalidate those
      // entries so switching tabs does not show an obsolete association.
      BlogCTLSyncState.clearMatches(localStorage);
      document.dispatchEvent(new CustomEvent("blogctl:binding-changed", {
        detail: { article, platform: platformID },
      }));
      BlogCTLPopup.setMessage(message, `${publishingProfile(platformID).label || platformID} ${label}关联已解除；远端内容未修改。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      state.bindingMutating = false;
      renderPlatforms();
    }
  }

  function appendBindingRows(wrapper, platformID, record, running) {
    if (!record) return;
    const entries = [
      { state: "draft", id: String(record.remoteId || ""), url: record.draftUrl || "", label: "草稿" },
      { state: "published", id: String(record.publishedRemoteId || ""), url: record.publishedUrl || "", label: "已发布" },
    ];
    const hasAny = entries.some((entry) => entry.id || entry.url);
    if (!hasAny) return;

    const container = document.createElement("div");
    container.className = "draft-binding-list";
    for (const entry of entries) {
      if (!entry.id && !entry.url) continue;
      const row = document.createElement("div");
      row.className = "draft-binding-row";
      const identity = document.createElement("span");
      identity.className = "draft-binding-identity";
      identity.textContent = entry.label + (entry.id ? ` · ID ${entry.id}` : "");
      row.append(identity);

      const link = BlogCTLSyncModel.articleMatchLink(platformID, {
        id: entry.id, url: entry.url, published: entry.state === "published",
      });
      if (link) {
        const anchor = document.createElement("a");
        anchor.textContent = link.label;
        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        row.append(anchor);
      }

      // State-specific delete with a matching remote ID prevents accidentally
      // removing a different association after a concurrent edit.
      if (entry.id) {
        const unbind = document.createElement("button");
        unbind.type = "button";
        unbind.className = "secondary compact";
        unbind.textContent = "解除绑定";
        unbind.disabled = running || state.bindingMutating || !state.status?.bridge?.running;
        unbind.title = "仅解除本地" + entry.label + "关联，不删除远端内容";
        unbind.addEventListener("click", () =>
          unbindPlatformRecord(platformID, entry.state, entry.id));
        row.append(unbind);
      }
      container.append(row);
    }
    wrapper.append(container);
  }

  function platformTaskResult(platformId) {
    if (!state.currentJob || !(state.currentJob.platforms ?? []).includes(platformId)) return null;
    return state.currentJob.results?.[platformId] ?? { state: state.currentJob.state || "queued" };
  }

  function renderPlatforms() {
    // Keep checked platforms when binding operations temporarily disable
    // controls. selectedPlatforms() intentionally omits disabled inputs and
    // would otherwise clear the selection while unbinding.
    const previous = platformsContainer.querySelector('input[data-platform]')
      ? new Set([...platformsContainer.querySelectorAll('input[data-platform]:checked')]
        .map((input) => input.dataset.platform))
      : state.selectedPlatformIDs;
    const article = selectedArticle();
    const running = ["queued", "running"].includes(state.currentJob?.state);
    platformsContainer.replaceChildren();

    for (const platform of BlogCTLSyncModel.visiblePlatforms(state.status?.platforms)) {
      const availability = platformAvailability(article, platform);
      const wrapper = document.createElement("div");
      wrapper.className = "platform-choice-card";
      wrapper.dataset.platformCard = platform.id;

      const card = document.createElement("label");
      card.className = "platform-choice";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.platform = platform.id;
      checkbox.checked = previous.has(platform.id) && availability.available;
      checkbox.disabled = !availability.available || running || state.bindingMutating ||
        (root.BlogCTLSync?.isBindingBusy?.() ?? false);
      checkbox.addEventListener("change", () => {
        resetWorkflow();
        state.selectedPlatformIDs = new Set(selectedPlatforms());
        BlogCTLSyncState.savePlatforms(localStorage, state.selectedPlatformIDs);
        renderPlatforms();
        document.dispatchEvent(new CustomEvent("blogctl:update-platform-selection"));
      });

      const text = document.createElement("span");
      text.className = "platform-choice-text";
      const name = document.createElement("strong");
      name.textContent = platform.label || platform.id;
      const detail = document.createElement("small");
      detail.textContent = !availability.available ? availability.reason : platformLifecycleText(platform.id);
      text.append(name, detail);

      const badge = document.createElement("span");
      if (!availability.available) BlogCTLPopup.setStatus(badge, "disabled", "不可更新", availability.reason);
      else BlogCTLPopup.setStatus(badge, "ok", "可更新");

      card.append(checkbox, text, badge);
      wrapper.append(card);

      const actions = document.createElement("div");
      actions.className = "platform-card-actions";
      const updatePlatformButton = document.createElement("button");
      updatePlatformButton.type = "button";
      updatePlatformButton.className = "secondary compact";
      updatePlatformButton.textContent = running && (state.currentJob?.platforms ?? []).includes(platform.id)
        ? "更新中…"
        : "更新此平台";
      updatePlatformButton.disabled = !state.selectedSlug || !availability.available ||
        !state.status?.bridge?.running || running || state.bindingMutating ||
        (root.BlogCTLSync?.isBindingBusy?.() ?? false);
      updatePlatformButton.addEventListener("click", () => startSavePlatforms([platform.id]));
      actions.append(updatePlatformButton);
      const record = publicationRecord(platform.id);
      if (platform.id === "toutiao" && platform.capabilities?.publishedUpdate === true &&
          (record?.publishedRemoteId && record?.publishedUrl)) {
        const republish = document.createElement("button");
        republish.type = "button";
        republish.className = "secondary compact";
        republish.textContent = running ? "提交中…" : "更新已发布";
        republish.disabled = !state.selectedSlug || !state.status?.bridge?.running || running;
        republish.addEventListener("click", () => startPublishedUpdate(platform.id));
        actions.append(republish);
      }
      if (!record?.remoteId && !record?.publishedRemoteId &&
          platform.capabilities?.remoteList === true) {
        const detect = document.createElement("button");
        detect.type = "button";
        detect.className = "secondary compact";
        detect.textContent = "检测关联";
        detect.disabled = !state.selectedSlug || running || state.bindingMutating ||
          !state.status?.bridge?.running;
        detect.addEventListener("click", () => {
          document.dispatchEvent(new CustomEvent("blogctl:detect-association", {
            detail: { article: state.selectedSlug, platform: platform.id },
          }));
        });
        actions.append(detect);
      }
      wrapper.append(actions);
      appendBindingRows(wrapper, platform.id, record, running);
      root.BlogCTLSync?.appendPlatformMatches?.(platform, wrapper);

      const taskResult = platformTaskResult(platform.id);
      if (taskResult) {
        const statusRow = document.createElement("div");
        statusRow.className = "platform-task-status";

        const statusLabel = document.createElement("span");
        statusLabel.textContent = "更新状态";
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

  function setDraftPlatforms(mode) {
    if (!state.selectedSlug) return;
    if (state.bindingMutating) return;
    const checkboxes = [...platformsContainer.querySelectorAll('input[type="checkbox"][data-platform]')]
      .filter((input) => !input.disabled);
    if (mode === "all") checkboxes.forEach((box) => { box.checked = true; });
    else checkboxes.forEach((box) => { box.checked = !box.checked; });
    resetWorkflow();
    state.selectedPlatformIDs = new Set(selectedPlatforms());
    BlogCTLSyncState.savePlatforms(localStorage, state.selectedPlatformIDs);
    renderPlatforms();
    document.dispatchEvent(new CustomEvent("blogctl:update-platform-selection"));
  }

  function completedPlatforms(job) {
    return (job?.platforms ?? []).filter((platform) =>
      BlogCTLSyncModel.isVisiblePlatform(platform) && job.results?.[platform]?.state === "completed");
  }

  function updateAction() {
    const count = selectedPlatforms().length;
    const job = state.currentJob;
    const running = ["queued", "running"].includes(job?.state);
    const terminal = ["completed", "failed"].includes(job?.state);
    const ready = Boolean(state.selectedSlug) && count > 0 &&
      Boolean(state.status?.bridge?.running) && !state.bindingMutating &&
      !(root.BlogCTLSync?.isBindingBusy?.() ?? false);

    actionButton.hidden = terminal;
    nextActions.hidden = !terminal;

    if (!terminal) {
      actionButton.disabled = !ready || running;
      actionButton.textContent = running
        ? "更新中…"
        : count > 0 ? `更新 ${count} 个平台` : "更新";
    }

    if (terminal) {
      const successful = completedPlatforms(job);
      viewTaskButton.disabled = false;
      enterPublishButton.disabled = job.operation === "update-published" || successful.length === 0;
      enterPublishButton.hidden = job.operation === "update-published";
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
        const publications = await BlogCTLPopup.send("blogctl.publications");
        state.records = publications.records ?? state.records;
        renderPlatforms();
        BlogCTLPopup.setMessage(message, state.currentJob.operation === "update-published"
          ? "已提交头条文章更新，请在头条后台确认审核及线上生效情况。"
          : "更新完成。可查看任务，或进入发布。", "ok");
        return;
      }
      if (state.currentJob.state === "failed") {
        const publications = await BlogCTLPopup.send("blogctl.publications");
        state.records = publications.records ?? state.records;
        renderPlatforms();
        const successful = completedPlatforms(state.currentJob).length;
        BlogCTLPopup.setMessage(
          message,
          successful > 0
            ? `部分平台更新失败；${successful} 个平台可继续发布。`
            : "更新失败，请查看任务详情。",
          "error",
        );
        return;
      }
    } catch (error) {
      BlogCTLPopup.setMessage(message, `任务状态读取失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    }

    state.pollTimer = setTimeout(() => pollJob(jobID), 1200);
  }

  async function startPublishedUpdate(platformID) {
    const article = state.selectedSlug;
    const record = publicationRecord(platformID);
    if (!BlogCTLSyncModel.isVisiblePlatform(platformID) ||
        platformID !== "toutiao" || !article || !record?.publishedRemoteId ||
        !record?.publishedUrl || !state.status?.bridge?.running ||
        ["queued", "running"].includes(state.currentJob?.state)) return;
    if (!window.confirm("将本地文章内容提交到今日头条已发布文章（ID " +
        record.publishedRemoteId + "），可能直接影响公开页面。确认更新？")) return;
    resetWorkflow();
    BlogCTLPopup.setMessage(message, "正在提交已发布文章更新任务…");
    try {
      const response = await BlogCTLPopup.send("blogctl.job.start", {
        request: {
          article, platforms: [platformID], dryRun: false,
          draft: false, operation: "update-published",
        },
      });
      state.currentJob = response.job ?? null;
      renderPlatforms();
      BlogCTLPopup.setMessage(message, "已发布文章更新任务已启动。", "ok");
      if (state.currentJob?.id) pollJob(state.currentJob.id);
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    }
  }

  async function startSavePlatforms(platforms) {
    const article = state.selectedSlug;
    const running = ["queued", "running"].includes(state.currentJob?.state);
    if (!article || !platforms.length || running || state.bindingMutating ||
        (root.BlogCTLSync?.isBindingBusy?.() ?? false) || !state.status?.bridge?.running ||
        platforms.some((id) => !BlogCTLSyncModel.isVisiblePlatform(id))) return;

    if (["completed", "failed"].includes(state.currentJob?.state)) resetWorkflow();

    actionButton.disabled = true;
    renderPlatforms();
    BlogCTLPopup.setMessage(
      message,
      platforms.length === 1 ? "正在创建单平台更新任务…" : "正在创建更新任务…",
    );
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
      BlogCTLPopup.setMessage(
        message,
        platforms.length === 1
          ? `${publishingProfile(platforms[0]).label || platforms[0]} 更新任务已启动，正在轮询状态。`
          : "更新任务已启动，正在轮询状态。",
        "ok",
      );
      if (state.currentJob?.id) pollJob(state.currentJob.id);
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      updateAction();
    }
  }

  async function startSave() {
    const platforms = selectedPlatforms();
    if (!platforms.length || actionButton.disabled) return;
    await startSavePlatforms(platforms);
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
      setArticleOptionsOpen(false);
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
      if (state.selectedSlug) setArticleOptionsOpen(false);
      document.dispatchEvent(new CustomEvent("blogctl:article-selected", {
        detail: { article: state.selectedSlug },
      }));
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
    selectAllButton = document.getElementById("selectAllDraftPlatforms");
    invertButton = document.getElementById("invertDraftPlatforms");

    articlePicker.addEventListener("focus", renderArticles);
    articlePicker.addEventListener("input", () => {
      resetWorkflow();
      state.selectedSlug = "";
      document.dispatchEvent(new CustomEvent("blogctl:article-selected", {
        detail: { article: "" },
      }));
      renderArticles();
      renderPlatforms();
    });
    articlePicker.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setArticleOptionsOpen(false);
        return;
      }
      if (event.key === "Enter" && articleOptions.querySelector("button")) {
        event.preventDefault();
        articleOptions.querySelector("button").click();
      }
    });

    document.addEventListener("blogctl:association-results-changed", () => {
      if (state.active) renderPlatforms();
    });
    actionButton.addEventListener("click", startSave);
    viewTaskButton.addEventListener("click", navigateTask);
    enterPublishButton.addEventListener("click", enterPublish);
    selectAllButton.addEventListener("click", () => setDraftPlatforms("all"));
    invertButton.addEventListener("click", () => setDraftPlatforms("invert"));
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

  root.BlogCTLDrafts = {
    init, activate, deactivate, refresh, prepare,
    selectedPlatformIDs: platformSelection, refreshBindings,
  };
})(globalThis);
