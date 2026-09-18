"use strict";

(function (root) {
  const state = { initialized: false, active: false, status: null, tools: [] };
  const EXPANDED_TOOLS_KEY = "blogctl.environment.expandedTools";
  const storedExpandedTools = (() => {
    try {
      const raw = localStorage.getItem(EXPANDED_TOOLS_KEY);
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed) : null;
    } catch {
      return null;
    }
  })();
  const expandedTools = storedExpandedTools ?? new Set();
  let initializedExpansion = storedExpandedTools !== null;
  let toolRegistry, platformStatuses, message;

  function persistExpandedTools() {
    localStorage.setItem(EXPANDED_TOOLS_KEY, JSON.stringify([...expandedTools]));
  }
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
    const input = document.createElement("input"); input.dataset.configKey = field.key; input.type = field.type === "integer" ? "number" : field.type === "secret" ? "password" : "text"; if (field.type === "secret") input.autocomplete = "off"; if (field.min) input.min = String(field.min); if (field.max) input.max = String(field.max); if (field.placeholder) input.placeholder = field.placeholder; input.value = tool.config?.values?.[field.key] ?? "";
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
  async function runToolAction(tool, action, button) {
    button.disabled = true;
    BlogCTLPopup.setMessage(message, `正在执行 ${tool.displayName || tool.name}：${action.label || action.id}…`);
    try {
      await BlogCTLPopup.send("blogctl.tool.action", { name: tool.name, action: action.id });
      BlogCTLPopup.setMessage(message, action.id === "restart" ? "Bridge 已重启并重新连接。" : "操作已完成。", "ok");
      await refresh();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      button.disabled = false;
    }
  }

  function renderTools() {
    toolRegistry.replaceChildren();
    if (!initializedExpansion) {
      for (const tool of state.tools) {
        if (tool.config?.defaultExpanded) expandedTools.add(tool.name);
      }
      initializedExpansion = true;
      persistExpandedTools();
    }

    for (const tool of state.tools) {
      const card = document.createElement("details");
      card.className = "tool-card";
      card.dataset.toolName = tool.name || "";
      card.open = expandedTools.has(tool.name);
      card.addEventListener("toggle", () => {
        if (card.open) expandedTools.add(tool.name);
        else expandedTools.delete(tool.name);
        persistExpandedTools();
      });

      const summary = document.createElement("summary");
      summary.className = "status-row";
      const name = document.createElement("strong"); name.textContent = tool.displayName || tool.name;
      const status = document.createElement("span");
      BlogCTLPopup.setStatus(status, healthKind(tool.health), tool.health?.summary || tool.health?.status || "未知", tool.health?.detail || "");
      summary.append(name, status);

      const body = document.createElement("div");
      body.className = "tool-card-body";
      if (tool.description) {
        const description = document.createElement("p");
        description.className = "card-hint";
        description.textContent = tool.description;
        body.append(description);
      }
      const detailText = [tool.health?.detail, tool.health?.path].filter(Boolean).join(" · ");
      if (detailText) {
        const detail = document.createElement("code");
        detail.className = "path-value";
        detail.textContent = detailText;
        body.append(detail);
      }
      if (tool.config?.toggle) {
        const toggleLabel = document.createElement("label"); toggleLabel.className = "switch-row";
        const text = document.createElement("span"); const title = document.createElement("strong"); title.textContent = tool.config.toggle.label; const detail = document.createElement("small"); detail.textContent = tool.config.toggle.description || ""; text.append(title, detail);
        const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.dataset.toggleKey = tool.config.toggle.key; toggle.checked = Boolean(tool.config.values?.[tool.config.toggle.key]); toggleLabel.append(text, toggle); body.append(toggleLabel);
      }
      for (const field of tool.config?.schema ?? []) body.append(makeConfigInput(tool, field));
      const configurable = Boolean(tool.config?.toggle || (tool.config?.schema ?? []).length);
      if (configurable) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary full-width";
        button.textContent = "保存";
        button.addEventListener("click", () => saveTool(tool, card, button));
        body.append(button);
      }
      const actions = Array.isArray(tool.actions) ? tool.actions : [];
      if (actions.length) {
        const actionRow = document.createElement("div"); actionRow.className = "tool-actions";
        for (const action of actions) {
          const button = document.createElement("button"); button.type = "button"; button.className = "secondary"; button.textContent = action.label || action.id; button.title = action.description || "";
          button.addEventListener("click", () => runToolAction(tool, action, button));
          actionRow.append(button);
        }
        body.append(actionRow);
      }

      card.append(summary, body);
      toolRegistry.append(card);
    }
    if (!toolRegistry.childElementCount) toolRegistry.innerHTML = '<div class="platform-loading">没有工具信息</div>';
  }
  function renderStatus(status) {
    state.status = status;
    renderPlatforms(status);
    BlogCTLPopup.refreshBridgeIndicator(status).catch(() => {});
  }
  async function refresh() {
    if (!state.active) return; BlogCTLPopup.setMessage(message);
    try {
      const [statusResponse, toolsResponse] = await Promise.all([BlogCTLPopup.send("blogctl.status"), BlogCTLPopup.send("blogctl.tools")]);
      state.tools = toolsResponse.tools ?? [];
      renderStatus(statusResponse.status); renderTools();
    }
    catch (error) { toolRegistry.innerHTML = '<div class="platform-loading">环境读取失败</div>'; BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error"); BlogCTLPopup.refreshBridgeIndicator().catch(() => {}); }
  }
  function init() {
    if (state.initialized) return; toolRegistry = document.getElementById("toolRegistry"); platformStatuses = document.getElementById("platformStatuses"); message = document.getElementById("environmentMessage"); state.initialized = true;
  }
  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLEnvironment = { init, activate, deactivate, refresh };
})(globalThis);
