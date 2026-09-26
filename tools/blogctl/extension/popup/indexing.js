"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    index: {},
    gsc: { known: false, loggedIn: false, error: "" },
    busy: new Set(),
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
      case "running": return "checking";
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

  function inspectionRequestCandidates(results) {
    return (Array.isArray(results) ? results : []).filter((result) =>
      String(result?.verdict || "").toUpperCase() !== "PASS" &&
      String(result?.indexingState || "").toUpperCase() === "INDEXING_ALLOWED" &&
      String(result?.robotsTxtState || "").toUpperCase() !== "DISALLOWED" &&
      Boolean(String(result?.url || "").trim())
    ).length;
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
    const requestCandidateCount = qStats.total || inspectionRequestCandidates(inspection.results);
    const requestPendingCount = qStats.total ? qStats.queued + qStats.failed : requestCandidateCount;

    setText(elements.source, inventory.source || "https://thinkerqaq.github.io/sitemap-all.txt");
    setText(elements.inventoryTotal, Number(inventory.total || 0) || "-");
    setText(elements.inventoryFetchedAt, formatDate(inventory.fetchedAt));

    setStatus(elements.bingStatus, operationKind(bing.state), operationLabel(bing.state), bing.error || "");
    setText(elements.bingFinishedAt, formatDate(bing.finishedAt));
    setText(elements.bingCount, Number(bing.count || 0) || "-");
    setText(elements.bingHTTP, bing.httpStatus || "-");

    setStatus(
      elements.googleCredentials,
      google.credentialsConfigured ? "ok" : "error",
      google.credentialsConfigured ? "Service Account 已配置" : "Service Account 未配置",
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

    if (state.gsc.known) {
      setStatus(
        elements.googleGSCStatus,
        state.gsc.loggedIn ? "ok" : "error",
        state.gsc.loggedIn ? "GSC 已登录" : "GSC 未就绪",
        state.gsc.error || "",
      );
    } else {
      setStatus(elements.googleGSCStatus, "disabled", "未检测");
    }

    setText(elements.requestTotal, requestCandidateCount);
    setText(elements.requestRequested, qStats.requested);
    setText(elements.requestIndexed, qStats.indexed);
    setText(elements.requestQueued, qStats.queued);
    setText(elements.requestFailed, qStats.failed);
    setText(elements.requestPosition, qStats.total ? `${Math.min(Number(queue.currentIndex || 0) + 1, qStats.total)} / ${qStats.total}` : "-");
    setText(elements.requestError, queue.lastError || "");

    const inventoryReady = Number(inventory.total || 0) > 0;
    const inspectionReady = iStats.checked > 0;
    elements.refreshInventory.disabled = state.busy.has("inventory");
    elements.bingSubmit.disabled = !inventoryReady || state.busy.has("bing");
    elements.googleSitemaps.disabled = !google.credentialsConfigured || state.busy.has("sitemaps");
    const inspectionComplete = inventoryReady && iStats.checked >= Number(inventory.total || 0);
    elements.googleInspect.disabled = !inventoryReady || !google.credentialsConfigured || inspectionComplete || state.busy.has("inspect");
    elements.googleInspect.textContent = inspectionComplete ? "Inspection 已完成" : "检查下一批";

    const queueState = String(queue.state || "idle");
    elements.googleRequestStart.disabled = !inspectionReady || requestPendingCount === 0 || ["running"].includes(queueState) || state.busy.has("request");
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
      if (successMessage) BlogCTLPopup.setMessage(elements.message, successMessage, "ok");
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

  async function submitBing() {
    await run("bing", { type: "blogctl.index.bing.submit" }, "Bing / IndexNow 全量提交完成。");
  }

  async function submitGoogleSitemaps() {
    await run("sitemaps", { type: "blogctl.index.google.sitemaps" }, "Google 两个 Sitemap 已提交。");
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
    }, `Google URL Inspection 已完成：offset ${offset}, limit ${limit}。`);
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
    if (message?.type !== "blogctl.index.progress" || !state.active) return;
    state.index = message.index || {};
    render();
  }

  function init() {
    if (state.initialized) return;
    elements = {
      source: el("indexSource"),
      inventoryTotal: el("indexInventoryTotal"),
      inventoryFetchedAt: el("indexInventoryFetchedAt"),
      refreshInventory: el("indexRefreshInventory"),
      bingStatus: el("indexBingStatus"),
      bingFinishedAt: el("indexBingFinishedAt"),
      bingCount: el("indexBingCount"),
      bingHTTP: el("indexBingHTTP"),
      bingSubmit: el("indexBingSubmit"),
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
    elements.bingSubmit.addEventListener("click", submitBing);
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
  }

  function deactivate() {
    state.active = false;
  }

  root.BlogCTLIndexing = { init, activate, deactivate, refresh };
})(globalThis);
