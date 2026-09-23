"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    jobs: [],
    status: null,
    ui: BlogCTLTaskUIState.create(localStorage),
    lastRenderedSnapshot: "",
    renderDeferredForSelection: false,
    pollTimer: null,
  };

  let list, refreshButton, clearButton, message;

  function stateLabel(job) {
    return BlogCTLSyncModel.statePresentation(job.state);
  }

  function platformRows(job) {
    return BlogCTLSyncModel.platformRows(job, state.status);
  }

  function renderPlatformResults(job, card) {
    const rows = platformRows(job);
    if (!rows.length) return;

    const container = document.createElement("div");
    container.className = "job-platform-results";
    for (const row of rows) {
      const item = document.createElement("div");
      item.className = "job-platform-result";

      const main = document.createElement("div");
      main.className = "job-platform-main";
      const name = document.createElement("strong");
      name.textContent = row.label;
      const status = document.createElement("span");
      BlogCTLPopup.setStatus(status, row.kind, row.statusLabel);
      main.append(name, status);
      item.append(main);

      const detailText = row.error || row.message;
      if (detailText) {
        const detail = document.createElement("small");
        detail.className = row.error ? "job-platform-message error-text" : "job-platform-message";
        detail.textContent = detailText;
        item.append(detail);
      }

      if (row.state === "completed") {
        const publication = document.createElement("button");
        publication.type = "button";
        publication.className = "task-publication-link";
        publication.textContent = "查看发布记录";
        publication.addEventListener("click", () => {
          document.dispatchEvent(new CustomEvent("blogctl:navigate-publication", {
            detail: { article: job.article, platform: row.id },
          }));
        });
        item.append(publication);
      }

      container.append(item);
    }
    card.append(container);
  }

  function renderDebugOutput(job, card) {
    if (!job.output) return;
    const details = document.createElement("details");
    details.className = "job-debug";
    BlogCTLTaskUIState.bindDetails(details, state.ui, "log", job.id);
    const summary = document.createElement("summary");
    summary.textContent = "详细日志";
    const output = document.createElement("pre");
    output.className = "job-output";
    output.textContent = job.output;
    details.append(summary, output);
    card.append(details);
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  async function retryJob(job, button) {
    button.disabled = true;
    BlogCTLPopup.setMessage(message, `正在重试任务 ${job.id}…`);
    try {
      const response = await BlogCTLPopup.send("blogctl.job.retry", { id: job.id });
      if (response.job?.id) state.ui.setJobExpanded(response.job.id, true);
      BlogCTLPopup.setMessage(message, "任务已重置并重新执行。", "ok");
      await refresh();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      button.disabled = false;
    }
  }

  function renderActions(job, card) {
    if (job.state !== "failed") return;
    const actions = document.createElement("div");
    actions.className = "task-actions";
    let retry;
    retry = actionButton("重试", "secondary compact", () => retryJob(job, retry));
    actions.append(retry);
    card.append(actions);
  }

  function selectionTouchesNode(node, selection) {
    if (!node || !selection || selection.isCollapsed || selection.rangeCount === 0) return false;
    return node.contains(selection.anchorNode) || node.contains(selection.focusNode);
  }

  function renderJobs(snapshot) {
    const selection = typeof root.getSelection === "function" ? root.getSelection() : null;
    if (selectionTouchesNode(list, selection)) {
      state.renderDeferredForSelection = true;
      return false;
    }
    state.renderDeferredForSelection = false;

    BlogCTLTaskUIState.captureDetails(
      list.querySelectorAll("details.job-item[data-job-id]"),
      state.ui,
    );
    const validIDs = new Set(state.jobs.map((job) => job.id));
    state.ui.prune(validIDs);
    list.replaceChildren();
    clearButton.disabled = !state.jobs.some((job) => job.state !== "running");

    if (!state.jobs.length) {
      list.innerHTML = '<div class="platform-loading">暂无任务</div>';
      state.lastRenderedSnapshot = snapshot;
      return true;
    }

    for (const job of state.jobs) {
      const card = document.createElement("details");
      card.className = "job-item";
      card.dataset.jobId = job.id;
      BlogCTLTaskUIState.bindDetails(card, state.ui, "job", job.id);

      const summary = document.createElement("summary");
      const title = document.createElement("span");
      title.textContent = job.article;
      const status = document.createElement("strong");
      const presentation = stateLabel(job);
      BlogCTLPopup.setStatus(status, presentation.kind, presentation.label);
      summary.append(title, status);
      card.append(summary);

      const meta = document.createElement("div");
      meta.className = "job-meta";
      const started = BlogCTLPopup.formatTime(job.startedAt);
      const finished = BlogCTLPopup.formatTime(job.finishedAt);
      meta.textContent = [
        started ? `开始 ${started}` : "",
        finished ? `结束 ${finished}` : "",
        job.operation === "publish" ? "发布" : job.operation === "update-published" ? "更新" : job.operation ? "创建／更新" : "",
        job.id ? `ID ${job.id}` : "",
      ].filter(Boolean).join(" · ");
      card.append(meta);

      renderPlatformResults(job, card);
      if (job.error) {
        const error = document.createElement("pre");
        error.className = "job-output error-output";
        error.textContent = job.error;
        card.append(error);
      }
      renderDebugOutput(job, card);
      renderActions(job, card);
      list.append(card);
    }
    state.lastRenderedSnapshot = snapshot;
    return true;
  }

  async function refresh(includeStatus = true) {
    if (!state.active) return;
    try {
      const jobsPromise = BlogCTLPopup.send("blogctl.jobs");
      const statusPromise = includeStatus || !state.status
        ? BlogCTLPopup.send("blogctl.status")
        : Promise.resolve(null);
      const [jobsResponse, statusResponse] = await Promise.all([jobsPromise, statusPromise]);
      state.jobs = jobsResponse.jobs ?? [];
      if (statusResponse) state.status = statusResponse.status;
      const snapshot = BlogCTLTaskUIState.renderSnapshot(state.jobs, state.status);
      if (!BlogCTLTaskUIState.shouldRender(state.lastRenderedSnapshot, snapshot, state.renderDeferredForSelection)) return;
      renderJobs(snapshot);
    } catch (error) {
      BlogCTLPopup.setMessage(message, `任务读取失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    }
  }

  async function clearFinished() {
    clearButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在清理已结束任务…");
    try {
      const response = await BlogCTLPopup.send("blogctl.jobs.clear");
      state.jobs = response.jobs ?? [];
      state.ui.prune(new Set(state.jobs.map((job) => job.id)));
      const snapshot = BlogCTLTaskUIState.renderSnapshot(state.jobs, state.status);
      renderJobs(snapshot);
      BlogCTLPopup.setMessage(message, `已清理 ${response.removed || 0} 个任务。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      clearButton.disabled = false;
    }
  }

  function init() {
    if (state.initialized) return;
    list = document.getElementById("taskList");
    refreshButton = document.getElementById("refreshTasks");
    clearButton = document.getElementById("clearFinishedTasks");
    message = document.getElementById("tasksMessage");
    refreshButton.addEventListener("click", () => refresh(true));
    clearButton.addEventListener("click", clearFinished);
    state.initialized = true;
  }

  function activate() {
    state.active = true;
    refresh(true);
    if (!state.pollTimer) state.pollTimer = setInterval(() => refresh(false), 2000);
  }

  function deactivate() {
    state.active = false;
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  root.BlogCTLTasks = { init, activate, deactivate, refresh };
})(globalThis);
