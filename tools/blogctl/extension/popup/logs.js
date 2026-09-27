"use strict";

const BlogCTLLogs = (() => {
  const state = {
    initialized: false,
    active: false,
    entries: [],
    path: "",
    configuredLevel: "",
    pollTimer: null,
  };

  let status, pathValue, output, queryInput, levelFilter, autoRefresh, selectAllButton, refreshButton, clearButton, message;

  function formatAttribute(value) {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function formatEntry(entry) {
    if (entry?.raw) return String(entry.raw);
    const time = entry?.time ? BlogCTLPopup.formatTime(entry.time) : "--:--:--";
    const level = String(entry?.level || "INFO").toUpperCase().padEnd(5, " ");
    const text = String(entry?.message || "");
    const attributes = Object.entries(entry?.attributes || {})
      .map(([key, value]) => `${key}=${formatAttribute(value)}`)
      .join(" ");
    return [`[${time}]`, level, text, attributes].filter(Boolean).join(" ");
  }

  function filteredEntries() {
    const selected = String(levelFilter?.value || "").toUpperCase();
    const query = String(queryInput?.value || "").trim().toLowerCase();
    return state.entries.filter((entry) => {
      if (selected && String(entry?.level || "").toUpperCase() !== selected) return false;
      if (query && !formatEntry(entry).toLowerCase().includes(query)) return false;
      return true;
    });
  }

  function render() {
    const entries = filteredEntries();
    const wasNearBottom = output.scrollHeight - output.scrollTop - output.clientHeight < 36;
    output.textContent = entries.length ? entries.map(formatEntry).join("\n") : "暂无日志";
    pathValue.textContent = state.path || "-";
    BlogCTLPopup.setStatus(
      status,
      "ok",
      `${String(state.configuredLevel || "info").toUpperCase()} · ${entries.length}${entries.length !== state.entries.length ? ` / ${state.entries.length}` : ""} 条`,
      state.path || "",
    );
    if (wasNearBottom || output.textContent === "暂无日志") {
      output.scrollTop = output.scrollHeight;
    }
  }

  async function refresh({ quiet = false } = {}) {
    if (!state.active && quiet) return;
    if (!quiet) refreshButton.disabled = true;
    try {
      const response = await BlogCTLPopup.send("blogctl.logs", { limit: 1000 });
      state.entries = Array.isArray(response.entries) ? response.entries : [];
      state.path = String(response.path || "");
      state.configuredLevel = String(response.level || "info");
      render();
      if (!quiet) BlogCTLPopup.setMessage(message, "日志已刷新。", "ok");
    } catch (error) {
      BlogCTLPopup.setStatus(status, "error", "读取失败", BlogCTLPopup.errorMessage(error));
      if (!quiet) BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      refreshButton.disabled = false;
    }
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function syncPolling() {
    stopPolling();
    if (!state.active || !autoRefresh.checked) return;
    state.pollTimer = setInterval(() => {
      refresh({ quiet: true });
    }, 1500);
  }

  function selectAllLogs() {
    if (!output || output.textContent === "暂无日志") return;
    if (autoRefresh?.checked) {
      autoRefresh.checked = false;
      syncPolling();
    }
    const selection = globalThis.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(output);
    selection.removeAllRanges();
    selection.addRange(range);
    BlogCTLPopup.setMessage(message, "已选中当前可见日志；自动刷新已暂停。", "ok");
  }

  async function clearLogs() {
    clearButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在清空日志…");
    try {
      await BlogCTLPopup.send("blogctl.logs.clear");
      await refresh({ quiet: true });
      BlogCTLPopup.setMessage(message, "日志已清空。", "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      clearButton.disabled = false;
    }
  }

  function init() {
    if (state.initialized) return;
    status = document.getElementById("logsStatus");
    pathValue = document.getElementById("logPath");
    output = document.getElementById("logOutput");
    queryInput = document.getElementById("logQuery");
    levelFilter = document.getElementById("logLevelFilter");
    autoRefresh = document.getElementById("logAutoRefresh");
    selectAllButton = document.getElementById("selectAllLogs");
    refreshButton = document.getElementById("refreshLogs");
    clearButton = document.getElementById("clearLogs");
    message = document.getElementById("logsMessage");

    refreshButton.addEventListener("click", () => refresh());
    clearButton.addEventListener("click", clearLogs);
    selectAllButton.addEventListener("click", selectAllLogs);
    queryInput.addEventListener("input", render);
    levelFilter.addEventListener("change", render);
    autoRefresh.addEventListener("change", syncPolling);
    state.initialized = true;
  }

  function activate() {
    state.active = true;
    refresh({ quiet: true });
    syncPolling();
  }

  function deactivate() {
    state.active = false;
    stopPolling();
  }

  return { init, activate, deactivate, refresh };
})();
