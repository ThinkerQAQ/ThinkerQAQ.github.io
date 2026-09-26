"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    index: {},
    gsc: { known: false, loggedIn: false, error: "" },
    busy: new Set(),
    pollTimer: null,
  };

  let elements = {};

  function el(id) { return document.getElementById(id); }

  function setBusy(name, busy) {
    if (busy) state.busy.add(name);
    else state.busy.delete(name);
    render();
  }

  function operationKind(value) {
    switch (String(value || "idle")) {
      case "completed": return "ok";
      case "running":
      case "queued": return "checking";
      case "failed":
      case "quota_blocked": return "error";
      case "paused": return "unknown";
      default: return "disabled";
    }
  }

  function operationLabel(value) {
    switch (String(value || "idle")) {
      case "completed": return "完成";
      case "running": return "运行中";
      case "queued": return "排队中";
      case "failed": return "失败";
      case "paused": return "已暂停";
      case "quota_blocked": return "配额已用尽";
      default: return "未运行";
    }
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function inspectionStats(results) {
    const list = Array.isArray(results) ? results : [];
    let indexed = 0;
    let neverCrawled = 0;
    let withoutSitemap = 0;
    for (const result of list) {
      if (String(result?.verdict || "").toUpperCase() === "PASS") indexed += 1;
      if (!result?.lastCrawlTime) neverCrawled += 1;
      if (!Array.isArray(result?.sitemap) || result.sitemap.length === 0) withoutSitemap += 1;
    }
    return {
      checked: list.length,
      indexed,
      notIndexed: Math.max(0, list.length - indexed),
      neverCrawled,
      withoutSitemap,
    };
  }

  function inspectionRequestCandidate(result) {
    const url = String(result?.url || "").trim();
    if (!url || String(result?.verdict || "").toUpperCase() === "PASS") return false;
    if (String(result?.robotsTxtState || "").toUpperCase() === "DISALLOWED") return false;
    const indexingState = String(result?.indexingState || "").toUpperCase();
    return !["BLOCKED_BY_META_TAG", "BLOCKED_BY_HTTP_HEADER", "BLOCKED_BY_ROBOTS_TXT"].includes(indexingState);
  }

  function requestOverview(results, queue) {
    const inspectionResults = Array.isArray(results) ? results : [];
    const queueItems = Array.isArray(queue?.items) ? queue.items : [];
    const queueByURL = new Map(
      queueItems.map((item) => [String(item?.url || "").trim(), item])
    );
    const candidateURLs = new Set();
    const indexedURLs = new Set();

    for (const result of inspectionResults) {
      const url = String(result?.url || "").trim();
      if (!url) continue;
      if (String(result?.verdict || "").toUpperCase() === "PASS") {
        indexedURLs.add(url);
        continue;
      }
      if (inspectionRequestCandidate(result)) candidateURLs.add(url);
    }

    let pending = 0;
    for (const url of candidateURLs) {
      const status = String(queueByURL.get(url)?.status || "queued");
      if (!["requested", "indexed", "failed", "quota_blocked"].includes(status)) pending += 1;
    }

    for (const item of queueItems) {
      if (String(item?.status || "") === "indexed") {
        const url = String(item?.url || "").trim();
        if (url) indexedURLs.add(url);
      }
    }

    const qStats = queueStats(queue);
    return {
      candidates: candidateURLs.size,
      requested: qStats.requested,
      indexedSkipped: indexedURLs.size,
      pending,
      failed: qStats.failed,
      queueTotal: qStats.total,
    };
  }

  function queueStats(queue) {
    const items = Array.isArray(queue?.items) ? queue.items : [];
    const counts = { total: items.length, requested: 0, indexed: 0, queued: 0, failed: 0 };
    for (const item of items) {
      switch (item?.status) {
        case "requested": counts.requested += 1; break;
        case "indexed": counts.indexed += 1; break;
        case "failed":
        case "quota_blocked": counts.failed += 1; break;
        default: counts.queued += 1; break;
      }
    }
    return counts;
  }

  function setText(target, value) {
    if (target) target.textContent = value;
  }

  function setStatus(target, kind, text, detail = "") {
    BlogCTLPopup.setStatus(target, kind, text, detail);
  }

  function render() {
    const index = state.index || {};
    const inventory = index.inventory || {};
    const bing = index.bing || {};
    const google = index.google || {};
    const sitemaps = google.sitemaps || {};
    const inspection = google.inspection || {};
    const queue = google.requestQueue || {};
    const iStats = inspectionStats(inspection.results);
    const qStats = queueStats(queue);
    const requestStats = requestOverview(inspection.results, queue);
    const requestCandidateCount = requestStats.candidates;
    const requestPendingCount = requestStats.pending + requestStats.failed;

    setText(elements.source, inventory.source || "https://thinkerqaq.github.io/sitemap-all.txt");
    setText(elements.inventoryTotal, Number(inventory.total || 0) || "-");
    const fingerprintCoverage = Number(inventory.fingerprintCoverage || 0);
    const inventoryTotal = Number(inventory.total || 0);
    setText(
      elements.inventoryFingerprintCoverage,
      inventoryTotal ? `${fingerprintCoverage} / ${inventoryTotal}` : "-"
    );
    setText(elements.inventoryFetchedAt, formatDate(inventory.fetchedAt));

    setStatus(elements.bingStatus, operationKind(bing.state), operationLabel(bing.state), bing.error || "");
    setText(elements.bingFinishedAt, formatDate(bing.finishedAt));
    setText(elements.bingMode, bing.mode === "full" ? "全量" : bing.mode === "incremental" ? "增量" : "-");
    setText(elements.bingCount, Number.isFinite(Number(bing.count)) ? Number(bing.count) : "-");
    setText(elements.bingNewCount, Number.isFinite(Number(bing.newCount)) ? Number(bing.newCount) : "-");
    setText(elements.bingChangedCount, Number.isFinite(Number(bing.changedCount)) ? Number(bing.changedCount) : "-");
    setText(elements.bingDeletedCount, Number.isFinite(Number(bing.deletedCount)) ? Number(bing.deletedCount) : "-");
    setText(elements.bingUnchangedCount, Number.isFinite(Number(bing.unchangedCount)) ? Number(bing.unchangedCount) : "-");
    setText(elements.bingHTTP, bing.httpStatus || (bing.state === "completed" && Number(bing.count || 0) === 0 ? "未请求" : "-"));

    setStatus(
      elements.googleCredentials,
      google.credentialsConfigured ? "ok" : "error",
      google.credentialsConfigured
        ? "Service Account 已配置"
        : google.credentialsError
          ? "Service Account 配置无效"
          : "Service Account 未配置",
      google.credentialsError || "",
    );
    setStatus(elements.googleSitemapStatus, operationKind(sitemaps.state), operationLabel(sitemaps.state), sitemaps.error || "");
    setText(elements.googleSitemapFinishedAt, formatDate(sitemaps.finishedAt));
    setText(elements.googleSitemapCount, Number(sitemaps.count || 0) || "-");

    setStatus(elements.googleInspectionStatus, operationKind(inspection.state), operationLabel(inspection.state), inspection.error || "");
    setText(elements.inspectionInspected, iStats.checked);
    setText(elements.inspectionIndexed, iStats.indexed);
    setText(elements.inspectionNotIndexed, iStats.notIndexed);
    setText(elements.inspectionNeverCrawled, iStats.neverCrawled);
    setText(elements.inspectionWithoutSitemap, iStats.withoutSitemap);
    setText(elements.inspectionRemaining, Number.isFinite(Number(inspection.remaining)) ? Number(inspection.remaining) : "-");

    const queueState = String(queue.state || "idle");
    if (queueState === "idle" && requestPendingCount > 0) {
      setStatus(elements.googleRequestStatus, "unknown", "待启动");
    } else if (queueState === "completed" && requestPendingCount > 0) {
      setStatus(elements.googleRequestStatus, "unknown", "有新候选");
    } else if (queueState === "running" && (!state.gsc.known || !state.gsc.ready)) {
      setStatus(elements.googleRequestStatus, "checking", "正在恢复 GSC", state.gsc.error || "");
    } else {
      setStatus(elements.googleRequestStatus, operationKind(queueState), operationLabel(queueState), queue.lastError || "");
    }

    if (state.gsc.known) {
      setStatus(
        elements.googleGSCStatus,
        state.gsc.ready ? "ok" : "error",
        state.gsc.ready ? "GSC 已就绪" : state.gsc.loggedIn ? "GSC 页面未就绪" : "GSC 未就绪",
        state.gsc.error || "",
      );
    } else {
      setStatus(elements.googleGSCStatus, "disabled", queueState === "running" ? "正在检测" : "未检测");
    }

    setText(elements.requestTotal, requestStats.candidates);
    setText(elements.requestRequested, requestStats.requested);
    setText(elements.requestIndexed, requestStats.indexedSkipped);
    setText(elements.requestQueued, requestStats.pending);
    setText(elements.requestFailed, requestStats.failed);
    setText(elements.requestPosition, requestStats.queueTotal ? `${Math.min(Number(queue.currentIndex || 0) + 1, requestStats.queueTotal)} / ${requestStats.queueTotal}` : "-");
    setText(elements.requestError, queue.lastError || "");

    const inventoryReady = Number(inventory.total || 0) > 0;
    const inspectionReady = iStats.checked > 0;
    elements.refreshInventory.disabled = state.busy.has("inventory");
    elements.bingSubmitIncremental.disabled = !inventoryReady || state.busy.has("bing");
    elements.bingSubmitFull.disabled = !inventoryReady || state.busy.has("bing");
    elements.googleSitemaps.disabled = !google.credentialsConfigured || state.busy.has("sitemaps");
    const inspectionComplete = inventoryReady && iStats.checked >= Number(inventory.total || 0);
    elements.googleInspect.disabled = !inventoryReady || !google.credentialsConfigured || inspectionComplete || state.busy.has("inspect");
    elements.googleInspect.textContent = inspectionComplete ? "Inspection 已完成" : "检查下一批";

    elements.googleRequestStart.disabled = !inspectionReady || requestPendingCount === 0 || ["running", "paused", "quota_blocked"].includes(queueState) || state.busy.has("request");
    elements.googleRequestPause.disabled = queueState !== "running" || state.busy.has("request");
    elements.googleRequestResume.disabled = !["paused", "quota_blocked"].includes(queueState) || state.busy.has("request");
    elements.googleOpen.disabled = state.busy.has("gsc");
  }

  async function run(name, message, successMessage) {
    setBusy(name, true);
    BlogCTLPopup.setMessage(elements.message);
    try {
      const response = await BlogCTLPopup.send(message.type, message.payload || {});
      if (response.index) state.index = response.index;
      if (response.google) state.gsc = response.google;
      render();
      if (successMessage) {
        const jobSuffix = response.job?.id ? ` · 已加入任务 ${response.job.id}` : "";
        BlogCTLPopup.setMessage(elements.message, successMessage + jobSuffix, "ok");
      }
      return response;
    } catch (error) {
      BlogCTLPopup.setMessage(elements.message, BlogCTLPopup.errorMessage(error), "error");
      throw error;
    } finally {
      setBusy(name, false);
    }
  }

  async function refresh() {
    if (!state.active) return;
    BlogCTLPopup.setMessage(elements.message);
    try {
      const response = await BlogCTLPopup.send("blogctl.index.get");
      state.index = response.index || {};
      if (response.google) state.gsc = response.google;
      render();
      BlogCTLPopup.refreshBridgeIndicator().catch(() => {});
    } catch (error) {
      BlogCTLPopup.setMessage(elements.message, BlogCTLPopup.errorMessage(error), "error");
      BlogCTLPopup.refreshBridgeIndicator().catch(() => {});
    }
  }

  async function refreshInventory() {
    await run("inventory", { type: "blogctl.index.inventory.refresh" }, "URL Inventory 已刷新。");
  }

  async function submitBing(mode) {
    const label = mode === "full" ? "全量" : "增量";
    await run("bing", {
      type: "blogctl.index.bing.submit",
      payload: { mode },
    }, `Bing / IndexNow ${label}任务已创建。`);
  }

  async function submitGoogleSitemaps() {
    await run("sitemaps", { type: "blogctl.index.google.sitemaps" }, "Google Sitemap 任务已创建。");
  }

  async function inspectGoogle() {
    const inspection = state.index?.google?.inspection || {};
    const inventory = state.index?.inventory || {};
    const total = Number(inventory.total || 0);
    const checked = Array.isArray(inspection.results) ? inspection.results.length : Number(inspection.inspected || 0);
    if (total > 0 && checked >= total) {
      BlogCTLPopup.setMessage(elements.message, "Google URL Inspection 已覆盖全部 URL。", "ok");
      return;
    }
    const offset = Number.isInteger(inspection.nextOffset)
      ? inspection.nextOffset
      : checked;

    const remaining = Math.max(0, total - offset);
    const limit = Math.min(2000, remaining || 2000);
    await run("inspect", {
      type: "blogctl.index.google.inspect",
      payload: { offset, limit },
    }, `Google URL Inspection 任务已创建：offset ${offset}, limit ${limit}。`);
  }

  async function openGSC() {
    await run("gsc", { type: "blogctl.index.google.open" }, "Google Search Console 已打开并检测。");
  }

  async function startGoogleRequestQueue() {
    await run("request", { type: "blogctl.index.google.request.start" }, "Request Indexing 队列已启动。");
  }

  async function pauseGoogleRequestQueue() {
    await run("request", { type: "blogctl.index.google.request.pause" }, "Request Indexing 队列已暂停。");
  }

  async function resumeGoogleRequestQueue() {
    await run("request", { type: "blogctl.index.google.request.resume" }, "Request Indexing 队列已继续。");
  }

  function onRuntimeMessage(message) {
    if (!state.active) return;
    if (message?.type === "blogctl.index.gsc") {
      state.gsc = message.google || state.gsc;
      render();
      return;
    }
    if (message?.type !== "blogctl.index.progress") return;
    state.index = message.index || {};
    if (message.google) state.gsc = message.google;
    render();
  }

  function init() {
    if (state.initialized) return;
    elements = {
      source: el("indexSource"),
      inventoryTotal: el("indexInventoryTotal"),
      inventoryFingerprintCoverage: el("indexInventoryFingerprintCoverage"),
      inventoryFetchedAt: el("indexInventoryFetchedAt"),
      refreshInventory: el("indexRefreshInventory"),
      bingStatus: el("indexBingStatus"),
      bingFinishedAt: el("indexBingFinishedAt"),
      bingMode: el("indexBingMode"),
      bingCount: el("indexBingCount"),
      bingNewCount: el("indexBingNewCount"),
      bingChangedCount: el("indexBingChangedCount"),
      bingDeletedCount: el("indexBingDeletedCount"),
      bingUnchangedCount: el("indexBingUnchangedCount"),
      bingHTTP: el("indexBingHTTP"),
      bingSubmitIncremental: el("indexBingSubmitIncremental"),
      bingSubmitFull: el("indexBingSubmitFull"),
      googleCredentials: el("indexGoogleCredentials"),
      googleSitemapStatus: el("indexGoogleSitemapStatus"),
      googleSitemapFinishedAt: el("indexGoogleSitemapFinishedAt"),
      googleSitemapCount: el("indexGoogleSitemapCount"),
      googleSitemaps: el("indexGoogleSitemaps"),
      googleInspectionStatus: el("indexGoogleInspectionStatus"),
      inspectionInspected: el("indexInspectionInspected"),
      inspectionIndexed: el("indexInspectionIndexed"),
      inspectionNotIndexed: el("indexInspectionNotIndexed"),
      inspectionNeverCrawled: el("indexInspectionNeverCrawled"),
      inspectionWithoutSitemap: el("indexInspectionWithoutSitemap"),
      inspectionRemaining: el("indexInspectionRemaining"),
      googleInspect: el("indexGoogleInspect"),
      googleRequestStatus: el("indexGoogleRequestStatus"),
      googleGSCStatus: el("indexGoogleGSCStatus"),
      requestTotal: el("indexRequestTotal"),
      requestRequested: el("indexRequestRequested"),
      requestIndexed: el("indexRequestIndexed"),
      requestQueued: el("indexRequestQueued"),
      requestFailed: el("indexRequestFailed"),
      requestPosition: el("indexRequestPosition"),
      requestError: el("indexRequestError"),
      googleOpen: el("indexGoogleOpen"),
      googleRequestStart: el("indexGoogleRequestStart"),
      googleRequestPause: el("indexGoogleRequestPause"),
      googleRequestResume: el("indexGoogleRequestResume"),
      message: el("indexingMessage"),
    };

    elements.refreshInventory.addEventListener("click", refreshInventory);
    elements.bingSubmitIncremental.addEventListener("click", () => submitBing("incremental"));
    elements.bingSubmitFull.addEventListener("click", () => submitBing("full"));
    elements.googleSitemaps.addEventListener("click", submitGoogleSitemaps);
    elements.googleInspect.addEventListener("click", inspectGoogle);
    elements.googleOpen.addEventListener("click", openGSC);
    elements.googleRequestStart.addEventListener("click", startGoogleRequestQueue);
    elements.googleRequestPause.addEventListener("click", pauseGoogleRequestQueue);
    elements.googleRequestResume.addEventListener("click", resumeGoogleRequestQueue);
    chrome.runtime.onMessage.addListener(onRuntimeMessage);
    state.initialized = true;
    render();
  }

  function activate() {
    state.active = true;
    refresh();
    if (!state.pollTimer) state.pollTimer = setInterval(() => refresh(), 2500);
  }

  function deactivate() {
    state.active = false;
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  root.BlogCTLIndexing = { init, activate, deactivate, refresh };
})(globalThis);
