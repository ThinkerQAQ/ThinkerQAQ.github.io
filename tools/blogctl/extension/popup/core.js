"use strict";

(function (root) {
  function errorMessage(error) {
    return error?.message || String(error);
  }

  function send(type, payload = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (!response?.ok) {
          const error = new Error(response?.error || "BlogCTL Extension request failed");
          error.code = response?.code || "";
          error.details = response?.details || null;
          error.status = response?.status || 0;
          error.response = response;
          reject(error);
          return;
        }
        resolve(response);
      });
    });
  }

  function setStatus(element, kind, text, detail = "") {
    if (!element) return;
    element.className = `status ${kind}`;
    element.textContent = text;
    element.title = detail;
  }

  function setMessage(element, text = "", type = "") {
    if (!element) return;
    element.textContent = text;
    element.className = `message${type ? ` ${type}` : ""}`;
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  async function refreshBridgeIndicator(status) {
    const indicator = document.getElementById("bridgeIndicator");
    try {
      const current = status || (await send("blogctl.status")).status;
      const bridge = current?.bridge ?? {};
      if (bridge.running && bridge.compatible === false) {
        const versions = [
          bridge.extensionVersion ? `Extension v${bridge.extensionVersion}` : "",
          bridge.nativeHostVersion ? `Native Host v${bridge.nativeHostVersion}` : "Native Host 版本未知",
          bridge.bridgeVersion ? `Bridge v${bridge.bridgeVersion}` : "Bridge 版本未知",
        ].filter(Boolean).join(" · ");
        setStatus(indicator, "error", "运行时版本不一致", versions);
      } else if (bridge.running) {
        setStatus(indicator, "ok", "Bridge 已连接", bridge.pid ? `PID ${bridge.pid}` : "");
      } else {
        setStatus(indicator, "error", "Bridge 未连接", bridge.error || "");
      }
      return current;
    } catch (error) {
      setStatus(indicator, "unknown", "Bridge 检测失败", errorMessage(error));
      throw error;
    }
  }

  root.BlogCTLPopup = {
    errorMessage,
    send,
    setStatus,
    setMessage,
    formatTime,
    refreshBridgeIndicator,
  };
})(globalThis);
