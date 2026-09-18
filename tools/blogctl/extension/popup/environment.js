"use strict";

(function (root) {
  const state = { initialized: false, active: false, status: null, tools: [] };
  let bridgeStatus, bridgeDetail, toolRegistry, platformStatuses, message;
  function platformById(status, id) { return (status?.platforms ?? []).find((platform) => platform.id === id) ?? {}; }
  function renderPlatforms(statusView) {
    platformStatuses.replaceChildren();
    for (const platform of statusView?.platforms ?? []) {
      const row = document.createElement("div"); row.className = "status-row";
      const text = document.createElement("span");
      text.textContent = platform.label || platform.id;
      const status = document.createElement("strong");
      if (platform.known === false) BlogCTLPopup.setStatus(status, "unknown", "检测失败", platform.error || "");
      else if (platform.loggedIn) BlogCTLPopup.setStatus(status, "ok", "已登录");
      else BlogCTLPopup.setStatus(status, "error", "未登录");
      row.append(text, status); platformStatuses.append(row);
    }
    if (!platformStatuses.childElementCount) platformStatuses.innerHTML = '<div class="platform-loading">没有可检测的平台</div>';
  }
  function healthKind(health) { if (health?.status === "disabled") return "disabled"; if (health?.ok) return "ok"; if (health?.status === "missing" || health?.status === "error") return "error"; return "unknown"; }
  function makeConfigInput(tool, field) {
    const label = document.createElement("label"); label.className = "field";
    const title = document.createElement("span"); title.textContent = field.label || field.key;
    const input = document.createElement("input"); input.dataset.configKey = field.key; input.type = field.type === "integer" ? "number" : "text"; if (field.min) input.min = String(field.min); if (field.max) input.max = String(field.max); if (field.placeholder) input.placeholder = field.placeholder; input.value = tool.config?.values?.[field.key] ?? "";
    label.append(title, input);
    if (field.description) { const hint = document.createElement("small"); hint.className = "field-hint"; hint.textContent = field.description; label.append(hint); }
    return label;
  }
  async function saveTool(tool, card, button) {
    const values = {}; const toggle = card.querySelector("[data-toggle-key]"); if (toggle) values[toggle.dataset.toggleKey] = toggle.checked;
    card.querySelectorAll("[data-config-key]").forEach((input) => { values[input.dataset.configKey] = input.type === "number" ? Number(input.value || 0) : input.value.trim(); });
    button.disabled = true; button.textContent = "正在保存…"; BlogCTLPopup.setMessage(message, `正在保存 ${tool.displayName}…`);
    try { const response = await BlogCTLPopup.send("blogctl.tool.save", { name: tool.name, config: values }); state.tools = response.tools ?? []; renderTools(); BlogCTLPopup.setMessage(message, `${tool.displayName} 已保存并重新检测。`, "ok"); }
    catch (error) { button.disabled = false; button.textContent = "保存"; BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error"); }
  }
  function renderTools() {
    toolRegistry.replaceChildren();
    for (const tool of state.tools) {
      const card = document.createElement("div"); card.className = "tool-card";
      const header = document.createElement("div"); header.className = "status-row";
      const name = document.createElement("strong"); name.textContent = tool.displayName || tool.name;
      const status = document.createElement("span"); BlogCTLPopup.setStatus(status, healthKind(tool.health), tool.health?.summary || tool.health?.status || "未知", tool.health?.detail || ""); header.append(name, status); card.append(header);
      if (tool.description) { const description = document.createElement("p"); description.className = "card-hint"; description.textContent = tool.description; card.append(description); }
      if (tool.health?.path) { const path = document.createElement("code"); path.className = "path-value"; path.textContent = tool.health.path; card.append(path); }
      if (tool.config?.toggle) {
        const toggleLabel = document.createElement("label"); toggleLabel.className = "switch-row";
        const text = document.createElement("span"); const title = document.createElement("strong"); title.textContent = tool.config.toggle.label; const detail = document.createElement("small"); detail.textContent = tool.config.toggle.description || ""; text.append(title, detail);
        const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.dataset.toggleKey = tool.config.toggle.key; toggle.checked = Boolean(tool.config.values?.[tool.config.toggle.key]); toggleLabel.append(text, toggle); card.append(toggleLabel);
      }
      for (const field of tool.config?.schema ?? []) card.append(makeConfigInput(tool, field));
      const configurable = Boolean(tool.config?.toggle || (tool.config?.schema ?? []).length);
      if (configurable) { const button = document.createElement("button"); button.type = "button"; button.className = "secondary full-width"; button.textContent = "保存"; button.addEventListener("click", () => saveTool(tool, card, button)); card.append(button); }
      toolRegistry.append(card);
    }
    if (!toolRegistry.childElementCount) toolRegistry.innerHTML = '<div class="platform-loading">没有工具信息</div>';
  }
  function renderStatus(status) {
    state.status = status; const bridge = status?.bridge ?? {};
    if (bridge.running) { BlogCTLPopup.setStatus(bridgeStatus, "ok", "运行中", bridge.pid ? `PID ${bridge.pid}` : ""); bridgeDetail.textContent = bridge.pid ? `PID ${bridge.pid} · 127.0.0.1:32145` : "127.0.0.1:32145"; }
    else { BlogCTLPopup.setStatus(bridgeStatus, "error", "未运行", bridge.error || ""); bridgeDetail.textContent = bridge.error || ""; }
    renderPlatforms(status);
    BlogCTLPopup.refreshBridgeIndicator(status).catch(() => {});
  }
  async function refresh() {
    if (!state.active) return; BlogCTLPopup.setMessage(message); bridgeDetail.textContent = "";
    try {
      const [statusResponse, toolsResponse] = await Promise.all([BlogCTLPopup.send("blogctl.status"), BlogCTLPopup.send("blogctl.tools")]);
      state.tools = toolsResponse.tools ?? [];
      let status = statusResponse.status;
      const medium = platformById(status, "medium");
      const session = status?.sessions?.medium ?? {};
      if (status?.bridge?.running && medium.known !== false && medium.loggedIn && !session.synced && !session.unavailable) {
        BlogCTLPopup.setMessage(message, "Medium 已登录，正在自动同步 Session…");
        try {
          const sessionResponse = await BlogCTLPopup.send("blogctl.session.sync", { platform: "medium" });
          status = sessionResponse.status;
          BlogCTLPopup.setMessage(message, "Medium Session 已自动同步。", "ok");
        } catch (error) {
          BlogCTLPopup.setMessage(message, `Medium Session 自动同步失败：${BlogCTLPopup.errorMessage(error)}`, "error");
        }
      }
      renderStatus(status); renderTools();
    }
    catch (error) { BlogCTLPopup.setStatus(bridgeStatus, "unknown", "检测失败", BlogCTLPopup.errorMessage(error)); bridgeDetail.textContent = BlogCTLPopup.errorMessage(error); toolRegistry.innerHTML = '<div class="platform-loading">环境读取失败</div>'; BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error"); BlogCTLPopup.refreshBridgeIndicator().catch(() => {}); }
  }
  function init() {
    if (state.initialized) return; bridgeStatus = document.getElementById("bridgeStatus"); bridgeDetail = document.getElementById("bridgeDetail"); toolRegistry = document.getElementById("toolRegistry"); platformStatuses = document.getElementById("platformStatuses"); message = document.getElementById("environmentMessage"); state.initialized = true;
  }
  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLEnvironment = { init, activate, deactivate, refresh };
})(globalThis);
