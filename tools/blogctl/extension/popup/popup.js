"use strict";

const bridgeStatus = document.getElementById("bridgeStatus");
const proxyStatus = document.getElementById("proxyStatus");
const proxyEnabled = document.getElementById("proxyEnabled");
const proxyHost = document.getElementById("proxyHost");
const proxyPort = document.getElementById("proxyPort");
const saveProxyButton = document.getElementById("saveProxy");
const proxyHint = document.getElementById("proxyHint");
const platformStatuses = document.getElementById("platformStatuses");
const mediumSessionStatus = document.getElementById("mediumSessionStatus");
const syncButton = document.getElementById("sync");
const refreshButton = document.getElementById("refresh");
const message = document.getElementById("message");

function setState(element, ok, okText, errorText, detail = "") {
  element.className = `status ${ok ? "ok" : "error"}`;
  element.textContent = ok ? okText : errorText;
  element.title = detail;
}

function setUnknown(element, text, detail = "") {
  element.className = "status unknown";
  element.textContent = text;
  element.title = detail;
}

function setDisabled(element, text, detail = "") {
  element.className = "status disabled";
  element.textContent = text;
  element.title = detail;
}

function setProxyControlsEnabled(enabled) {
  proxyEnabled.disabled = !enabled;
  proxyHost.disabled = !enabled;
  proxyPort.disabled = !enabled;
  saveProxyButton.disabled = !enabled;
}

function setChecking() {
  bridgeStatus.className = "status checking";
  bridgeStatus.textContent = "检测中";
  bridgeStatus.title = "";
  proxyStatus.className = "status checking";
  proxyStatus.textContent = "检测中";
  proxyStatus.title = "";
  setProxyControlsEnabled(false);
  mediumSessionStatus.className = "status checking";
  mediumSessionStatus.textContent = "检测中";
  mediumSessionStatus.title = "";
  platformStatuses.innerHTML = '<div class="platform-loading">正在检测平台登录状态…</div>';
}

function setMessage(text = "", type = "") {
  message.textContent = text;
  message.className = `message${type ? ` ${type}` : ""}`;
}

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      if (!response?.ok) {
        reject(Object.assign(new Error(response?.error || "BlogCTL Extension request failed"), { response }));
        return;
      }
      resolve(response);
    });
  });
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
      setUnknown(status, "检测失败", platform.error || "");
    } else {
      setState(status, Boolean(platform.loggedIn), "已登录", "未登录");
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
    setUnknown(proxyStatus, "不可用", bridge.error || "BlogCTL Bridge 未运行");
    setProxyControlsEnabled(false);
    proxyHint.textContent = "代理配置保存在本机 BlogCTL。启动一次需要 Bridge 的同步任务后可在这里配置。";
    return;
  }
  if (bridge.configKnown === false) {
    setUnknown(proxyStatus, "检测失败", bridge.configError || "无法读取 BlogCTL 配置");
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
    setState(proxyStatus, true, "已启用", "", bridge.networkMode || "");
    proxyHint.textContent = `Bridge 外网请求经 ${bridge.networkMode || `${config.proxyHost}:${config.proxyPort}`}；配置会持久化。`;
  } else {
    setDisabled(proxyStatus, "直连");
    proxyHint.textContent = "Bridge 外网请求当前直连；已填写的代理地址关闭后仍会保留。";
  }
}

function render(status) {
  const bridge = status?.bridge ?? {};
  const medium = platformById(status, "medium");
  const mediumSession = status?.sessions?.medium ?? {};

  setState(
    bridgeStatus,
    Boolean(bridge.running),
    "运行中",
    "未运行",
    bridge.error || "",
  );

  renderProxy(bridge);
  renderPlatforms(status?.platforms);

  if (mediumSession.unavailable) {
    setUnknown(mediumSessionStatus, "不可用", mediumSession.error || "BlogCTL Bridge 未运行");
  } else if (mediumSession.known === false) {
    setUnknown(mediumSessionStatus, "检测失败", mediumSession.error || "");
  } else {
    const sessionText = mediumSession.synced && mediumSession.expiresInSeconds > 0
      ? `已同步 · ${Math.max(1, Math.ceil(mediumSession.expiresInSeconds / 60))} 分钟`
      : "未同步";
    setState(mediumSessionStatus, Boolean(mediumSession.synced), sessionText, "未同步");
  }

  syncButton.disabled = !bridge.running || medium.known === false || !medium.loggedIn;
}

async function refresh() {
  setChecking();
  setMessage();
  try {
    const response = await send({ type: "blogctl.status" });
    render(response.status);
  } catch (error) {
    setUnknown(bridgeStatus, "检测失败", error.message || String(error));
    setUnknown(proxyStatus, "未知");
    setProxyControlsEnabled(false);
    platformStatuses.innerHTML = '<div class="platform-loading">状态读取失败</div>';
    setUnknown(mediumSessionStatus, "未知");
    syncButton.disabled = true;
    setMessage(error.message || String(error), "error");
  }
}

saveProxyButton.addEventListener("click", async () => {
  const host = proxyHost.value.trim();
  const port = Number(proxyPort.value || 0);
  if ((host && !port) || (!host && port)) {
    setMessage("代理主机和端口必须同时填写。", "error");
    return;
  }
  if (proxyEnabled.checked && (!host || port < 1 || port > 65535)) {
    setMessage("启用代理前请填写有效的代理主机和端口。", "error");
    return;
  }

  saveProxyButton.disabled = true;
  saveProxyButton.textContent = "正在保存…";
  setMessage("正在保存 BlogCTL 网络代理配置…");
  try {
    const response = await send({
      type: "blogctl.config.save",
      config: {
        proxyEnabled: proxyEnabled.checked,
        proxyHost: host,
        proxyPort: port,
      },
    });
    render(response.status);
    setMessage("代理配置已保存，并已应用到当前 Bridge。后续 sync 会自动读取。", "ok");
  } catch (error) {
    if (error.response?.status) render(error.response.status);
    setMessage(error.message || String(error), "error");
  } finally {
    saveProxyButton.textContent = "保存代理设置";
    if (bridgeStatus.textContent === "运行中") saveProxyButton.disabled = false;
  }
});

syncButton.addEventListener("click", async () => {
  syncButton.disabled = true;
  syncButton.textContent = "正在同步…";
  setMessage("正在把 Medium 浏览器登录态发送给本地 BlogCTL Bridge…");
  try {
    const response = await send({ type: "blogctl.sync", platform: "medium" });
    render(response.status);
    setMessage("Medium Session 已同步。终端会继续创建 Draft。", "ok");
  } catch (error) {
    if (error.response?.status) render(error.response.status);
    setMessage(error.message || String(error), "error");
  } finally {
    syncButton.textContent = "同步 Medium Session";
  }
});

refreshButton.addEventListener("click", refresh);

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;
  refresh();
});
