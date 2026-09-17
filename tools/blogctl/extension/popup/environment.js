"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    status: null,
  };

  let bridgeStatus;
  let proxyStatus;
  let proxyEnabled;
  let proxyHost;
  let proxyPort;
  let saveProxyButton;
  let proxyHint;
  let platformStatuses;
  let mediumSessionStatus;
  let syncMediumSessionButton;
  let message;

  function setProxyControlsEnabled(enabled) {
    proxyEnabled.disabled = !enabled;
    proxyHost.disabled = !enabled;
    proxyPort.disabled = !enabled;
    saveProxyButton.disabled = !enabled;
  }

  function setChecking() {
    BlogCTLPopup.setStatus(bridgeStatus, "checking", "检测中");
    BlogCTLPopup.setStatus(proxyStatus, "checking", "检测中");
    BlogCTLPopup.setStatus(mediumSessionStatus, "checking", "检测中");
    platformStatuses.innerHTML = '<div class="platform-loading">正在检测平台登录状态…</div>';
    setProxyControlsEnabled(false);
    syncMediumSessionButton.disabled = true;
  }

  function renderPlatforms(platforms) {
    platformStatuses.replaceChildren();
    for (const platform of platforms ?? []) {
      const row = document.createElement("div");
      row.className = "status-row";

      const label = document.createElement("span");
      label.textContent = platform.label || platform.id;

      const status = document.createElement("strong");
      if (platform.known === false) {
        BlogCTLPopup.setStatus(status, "unknown", "检测失败", platform.error || "");
      } else if (platform.loggedIn) {
        BlogCTLPopup.setStatus(status, "ok", "已登录");
      } else {
        BlogCTLPopup.setStatus(status, "error", "未登录");
      }

      row.append(label, status);
      platformStatuses.append(row);
    }

    if (!platformStatuses.childElementCount) {
      platformStatuses.innerHTML = '<div class="platform-loading">没有可检测的平台</div>';
    }
  }

  function platformById(status, id) {
    return (status?.platforms ?? []).find((platform) => platform.id === id) ?? {};
  }

  function renderProxy(bridge) {
    if (!bridge.running) {
      BlogCTLPopup.setStatus(proxyStatus, "unknown", "不可用", bridge.error || "BlogCTL Bridge 未运行");
      setProxyControlsEnabled(false);
      proxyHint.textContent = "Bridge 未运行，当前不能修改代理设置。";
      return;
    }
    if (bridge.configKnown === false) {
      BlogCTLPopup.setStatus(proxyStatus, "unknown", "检测失败", bridge.configError || "无法读取 BlogCTL 配置");
      setProxyControlsEnabled(false);
      proxyHint.textContent = "Bridge 已运行，但代理配置读取失败。";
      return;
    }

    const config = bridge.config ?? {};
    proxyEnabled.checked = Boolean(config.proxyEnabled);
    proxyHost.value = config.proxyHost || "";
    proxyPort.value = Number(config.proxyPort || 0) > 0 ? String(config.proxyPort) : "";
    setProxyControlsEnabled(true);

    if (config.proxyEnabled) {
      BlogCTLPopup.setStatus(proxyStatus, "ok", "已启用", bridge.networkMode || "");
      proxyHint.textContent = `Bridge 外网请求经 ${bridge.networkMode || `${config.proxyHost}:${config.proxyPort}`}。`;
    } else {
      BlogCTLPopup.setStatus(proxyStatus, "disabled", "直连");
      proxyHint.textContent = "Bridge 外网请求当前直连。";
    }
  }

  function render(status) {
    state.status = status;
    const bridge = status?.bridge ?? {};
    const medium = platformById(status, "medium");
    const mediumSession = status?.sessions?.medium ?? {};

    if (bridge.running) {
      BlogCTLPopup.setStatus(bridgeStatus, "ok", "运行中", bridge.pid ? `PID ${bridge.pid}` : "");
    } else {
      BlogCTLPopup.setStatus(bridgeStatus, "error", "未运行", bridge.error || "");
    }

    renderProxy(bridge);
    renderPlatforms(status?.platforms);

    if (mediumSession.unavailable) {
      BlogCTLPopup.setStatus(mediumSessionStatus, "unknown", "不可用", mediumSession.error || "BlogCTL Bridge 未运行");
    } else if (mediumSession.known === false) {
      BlogCTLPopup.setStatus(mediumSessionStatus, "unknown", "检测失败", mediumSession.error || "");
    } else if (mediumSession.synced) {
      const minutes = Math.max(1, Math.ceil(Number(mediumSession.expiresInSeconds || 0) / 60));
      BlogCTLPopup.setStatus(mediumSessionStatus, "ok", `已同步 · ${minutes} 分钟`);
    } else {
      BlogCTLPopup.setStatus(mediumSessionStatus, "error", "未同步");
    }

    syncMediumSessionButton.disabled = !bridge.running || medium.known === false || !medium.loggedIn;
    BlogCTLPopup.refreshBridgeIndicator(status).catch(() => {});
  }

  async function refresh() {
    if (!state.active) return;
    setChecking();
    BlogCTLPopup.setMessage(message);
    try {
      const response = await BlogCTLPopup.send("blogctl.status");
      render(response.status);
    } catch (error) {
      BlogCTLPopup.setStatus(bridgeStatus, "unknown", "检测失败", BlogCTLPopup.errorMessage(error));
      BlogCTLPopup.setStatus(proxyStatus, "unknown", "未知");
      BlogCTLPopup.setStatus(mediumSessionStatus, "unknown", "未知");
      platformStatuses.innerHTML = '<div class="platform-loading">状态读取失败</div>';
      setProxyControlsEnabled(false);
      syncMediumSessionButton.disabled = true;
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      BlogCTLPopup.refreshBridgeIndicator().catch(() => {});
    }
  }

  async function saveProxy() {
    const host = proxyHost.value.trim();
    const port = Number(proxyPort.value || 0);
    if ((host && !port) || (!host && port)) {
      BlogCTLPopup.setMessage(message, "代理主机和端口必须同时填写。", "error");
      return;
    }
    if (proxyEnabled.checked && (!host || port < 1 || port > 65535)) {
      BlogCTLPopup.setMessage(message, "启用代理前请填写有效的代理主机和端口。", "error");
      return;
    }

    saveProxyButton.disabled = true;
    saveProxyButton.textContent = "正在保存…";
    BlogCTLPopup.setMessage(message, "正在保存 BlogCTL 网络代理配置…");
    try {
      const response = await BlogCTLPopup.send("blogctl.config.save", {
        config: {
          proxyEnabled: proxyEnabled.checked,
          proxyHost: host,
          proxyPort: port,
        },
      });
      render(response.status);
      BlogCTLPopup.setMessage(message, "代理配置已保存。", "ok");
    } catch (error) {
      if (error.response?.status) render(error.response.status);
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      saveProxyButton.textContent = "保存代理设置";
      if (state.status?.bridge?.running) saveProxyButton.disabled = false;
    }
  }

  async function syncMediumSession() {
    syncMediumSessionButton.disabled = true;
    syncMediumSessionButton.textContent = "正在同步…";
    BlogCTLPopup.setMessage(message, "正在把 Medium 浏览器登录态发送给本地 BlogCTL Bridge…");
    try {
      const response = await BlogCTLPopup.send("blogctl.sync", { platform: "medium" });
      render(response.status);
      BlogCTLPopup.setMessage(message, "Medium Session 已同步。", "ok");
    } catch (error) {
      if (error.response?.status) render(error.response.status);
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      syncMediumSessionButton.textContent = "同步 Medium Session";
      if (state.status) render(state.status);
    }
  }

  function init() {
    if (state.initialized) return;
    bridgeStatus = document.getElementById("bridgeStatus");
    proxyStatus = document.getElementById("proxyStatus");
    proxyEnabled = document.getElementById("proxyEnabled");
    proxyHost = document.getElementById("proxyHost");
    proxyPort = document.getElementById("proxyPort");
    saveProxyButton = document.getElementById("saveProxy");
    proxyHint = document.getElementById("proxyHint");
    platformStatuses = document.getElementById("platformStatuses");
    mediumSessionStatus = document.getElementById("mediumSessionStatus");
    syncMediumSessionButton = document.getElementById("syncMediumSession");
    message = document.getElementById("environmentMessage");

    saveProxyButton.addEventListener("click", saveProxy);
    syncMediumSessionButton.addEventListener("click", syncMediumSession);
    state.initialized = true;
  }

  function activate() {
    state.active = true;
    refresh();
  }

  function deactivate() {
    state.active = false;
  }

  root.BlogCTLEnvironment = { init, activate, deactivate, refresh };
})(globalThis);
