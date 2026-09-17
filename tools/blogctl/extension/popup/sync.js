"use strict";

(function (root) {
  const state = { initialized: false, active: false, articles: [], status: null, jobs: [], pollTimer: null };
  let articleFilter, articleSelect, articleMeta, platformsContainer, changedOnly, dryRun, draftMode, startButton, message, jobsContainer, refreshJobsButton;

  function selectedPlatforms() {
    return [...platformsContainer.querySelectorAll('input[type="checkbox"][data-platform]:checked')].map((input) => input.dataset.platform);
  }

  function updateStartButton() {
    const count = selectedPlatforms().length;
    const ready = Boolean(articleSelect.value) && count > 0 && Boolean(state.status?.bridge?.running);
    startButton.disabled = !ready;
    startButton.textContent = ready ? `同步到 ${count} 个平台` : "选择文章和平台后同步";
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
    platformsContainer.replaceChildren();
    for (const platform of state.status?.platforms ?? []) {
      const label = document.createElement("label");
      label.className = "platform-choice";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.platform = platform.id;
      checkbox.checked = previous.has(platform.id);
      checkbox.addEventListener("change", updateStartButton);
      const text = document.createElement("span");
      text.className = "platform-choice-text";
      const name = document.createElement("strong");
      name.textContent = platform.label || platform.id;
      const detail = document.createElement("small");
      detail.textContent = platform.known === false ? `登录状态检测失败${platform.error ? ` · ${platform.error}` : ""}` : platform.loggedIn ? "已登录" : "未登录";
      text.append(name, detail);
      const status = document.createElement("span");
      if (platform.known === false) BlogCTLPopup.setStatus(status, "unknown", "未知");
      else if (platform.loggedIn) BlogCTLPopup.setStatus(status, "ok", "已登录");
      else BlogCTLPopup.setStatus(status, "error", "未登录");
      label.append(checkbox, text, status);
      platformsContainer.append(label);
    }
    if (!platformsContainer.childElementCount) platformsContainer.innerHTML = '<div class="platform-loading">没有可用平台</div>';
    updateStartButton();
  }

  function stateLabel(job) {
    if (job.state === "running") return ["checking", "运行中"];
    if (job.state === "completed") return ["ok", "完成"];
    if (job.state === "failed") return ["error", "失败"];
    return ["unknown", job.state || "未知"];
  }

  function renderJobs() {
    jobsContainer.replaceChildren();
    if (!state.jobs.length) { jobsContainer.innerHTML = '<div class="platform-loading">暂无任务</div>'; return; }
    for (const job of state.jobs) {
      const card = document.createElement("details");
      card.className = "job-item";
      const summary = document.createElement("summary");
      const title = document.createElement("span");
      title.textContent = `${job.article} · ${(job.platforms ?? []).join(", ")}`;
      const status = document.createElement("strong");
      const [kind, label] = stateLabel(job);
      BlogCTLPopup.setStatus(status, kind, label);
      summary.append(title, status);
      card.append(summary);
      const meta = document.createElement("div");
      meta.className = "job-meta";
      const started = BlogCTLPopup.formatTime(job.startedAt);
      const finished = BlogCTLPopup.formatTime(job.finishedAt);
      meta.textContent = [started ? `开始 ${started}` : "", finished ? `结束 ${finished}` : "", job.dryRun ? "Dry Run" : ""].filter(Boolean).join(" · ");
      card.append(meta);
      if (job.error) { const error = document.createElement("pre"); error.className = "job-output error-output"; error.textContent = job.error; card.append(error); }
      if (job.output) { const output = document.createElement("pre"); output.className = "job-output"; output.textContent = job.output; card.append(output); }
      jobsContainer.append(card);
    }
  }

  async function refreshJobs() {
    try {
      const response = await BlogCTLPopup.send("blogctl.jobs");
      state.jobs = response.jobs ?? [];
      renderJobs();
    } catch (error) {
      if (state.active) BlogCTLPopup.setMessage(message, `任务读取失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    }
  }

  async function ensureMediumSession(platforms) {
    if (!platforms.includes("medium")) return;
    const medium = (state.status?.platforms ?? []).find((platform) => platform.id === "medium");
    if (!medium?.loggedIn) throw new Error("Medium 尚未登录，请先在浏览器登录 Medium。");
    if (state.status?.sessions?.medium?.synced) return;
    BlogCTLPopup.setMessage(message, "Medium 已选择，正在自动同步浏览器 Session…");
    const response = await BlogCTLPopup.send("blogctl.session.sync", { platform: "medium" });
    state.status = response.status;
    BlogCTLPopup.refreshBridgeIndicator(state.status).catch(() => {});
    renderPlatforms();
  }

  async function startSync() {
    const article = articleSelect.value;
    const platforms = selectedPlatforms();
    if (!article || !platforms.length) return;
    startButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在创建同步任务…");
    try {
      await ensureMediumSession(platforms);
      const response = await BlogCTLPopup.send("blogctl.job.start", { request: { article, platforms, dryRun: dryRun.checked, changed: changedOnly.checked, draft: draftMode.checked } });
      BlogCTLPopup.setMessage(message, `任务 ${response.job?.id || ""} 已启动。`, "ok");
      await refreshJobs();
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
      const [articlesResponse, statusResponse, jobsResponse] = await Promise.all([BlogCTLPopup.send("blogctl.articles"), BlogCTLPopup.send("blogctl.status"), BlogCTLPopup.send("blogctl.jobs")]);
      state.articles = articlesResponse.articles ?? [];
      state.status = statusResponse.status;
      state.jobs = jobsResponse.jobs ?? [];
      BlogCTLPopup.refreshBridgeIndicator(state.status).catch(() => {});
      renderArticles(); renderPlatforms(); renderJobs();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      updateStartButton();
    }
  }

  function init() {
    if (state.initialized) return;
    articleFilter = document.getElementById("articleFilter"); articleSelect = document.getElementById("articleSelect"); articleMeta = document.getElementById("articleMeta"); platformsContainer = document.getElementById("syncPlatforms"); changedOnly = document.getElementById("changedOnly"); dryRun = document.getElementById("dryRun"); draftMode = document.getElementById("draftMode"); startButton = document.getElementById("startSync"); message = document.getElementById("syncMessage"); jobsContainer = document.getElementById("syncJobs"); refreshJobsButton = document.getElementById("refreshJobs");
    articleFilter.addEventListener("input", renderArticles);
    articleSelect.addEventListener("change", () => { renderArticleMeta(); updateStartButton(); });
    startButton.addEventListener("click", startSync);
    refreshJobsButton.addEventListener("click", refreshJobs);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh(); if (!state.pollTimer) state.pollTimer = setInterval(refreshJobs, 2000); }
  function deactivate() { state.active = false; if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; } }
  root.BlogCTLSync = { init, activate, deactivate, refresh };
})(globalThis);
