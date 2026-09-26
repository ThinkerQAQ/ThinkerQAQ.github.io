"use strict";

(function (root) {
  const state = { initialized: false, active: false, tools: [] };
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
  let runtimeTools, searchEngineTools, dependencyTools, searchEngineStatus;
  let platformConfigCard, searchEngineCard, message;

  function persistExpandedTools() {
    localStorage.setItem(EXPANDED_TOOLS_KEY, JSON.stringify([...expandedTools]));
  }
  function healthKind(health) { if (health?.status === "disabled") return "disabled"; if (health?.ok) return "ok"; if (health?.status === "missing" || health?.status === "error") return "error"; return "unknown"; }
  function makeConfigInput(tool, field) {
    const label = document.createElement("label");
    label.className = "field";
    const title = document.createElement("span");
    title.textContent = field.label || field.key;

    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      for (const optionValue of field.options ?? []) {
        const option = document.createElement("option");
        option.value = String(optionValue);
        option.textContent = String(optionValue).toUpperCase();
        input.append(option);
      }
    } else {
      input = document.createElement("input");
      input.type = field.type === "integer" ? "number" : field.type === "secret" ? "password" : "text";
      if (field.type === "secret") input.autocomplete = "off";
      if (field.min) input.min = String(field.min);
      if (field.max) input.max = String(field.max);
      if (field.placeholder) input.placeholder = field.placeholder;
    }
    input.dataset.configKey = field.key;
    input.value = tool.config?.values?.[field.key] ?? "";
    label.append(title, input);
    if (field.description) {
      const hint = document.createElement("small");
      hint.className = "field-hint";
      hint.textContent = field.description;
      label.append(hint);
    }
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
    const originalText = button.textContent;
    button.disabled = true;
    if (action.id === "update") button.textContent = "更新中…";
    BlogCTLPopup.setMessage(message, `正在执行 ${tool.displayName || tool.name}：${action.label || action.id}…`);
    try {
      const response = await BlogCTLPopup.send("blogctl.tool.action", { name: tool.name, action: action.id });
      if (Array.isArray(response.tools)) {
        state.tools = response.tools;
        renderTools();
      }
      const detail = response.detail && typeof response.detail === "object"
        ? Object.entries(response.detail)
          .filter(([key, value]) => key !== "output" && value !== "" && value !== null && value !== undefined)
          .map(([key, value]) => `${key}: ${value}`).join(" · ")
        : "";
      const text = action.id === "restart"
        ? "Bridge 已重启并重新连接。"
        : [response.message || "操作已完成。", detail].filter(Boolean).join(" · ");
      BlogCTLPopup.setMessage(message, text, "ok");
      if (!Array.isArray(response.tools)) await refresh();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function trackExpansion(card, key) {
    card.open = expandedTools.has(key);
    card.addEventListener("toggle", () => {
      if (card.open) expandedTools.add(key);
      else expandedTools.delete(key);
      persistExpandedTools();
    });
  }

  function createToolCard(tool) {
    const card = document.createElement("details");
    card.className = "tool-card";
    card.dataset.toolName = tool.name || "";
    trackExpansion(card, tool.name);

    const summary = document.createElement("summary");
    summary.className = "status-row";
    const name = document.createElement("strong");
    name.textContent = tool.displayName || tool.name;
    const status = document.createElement("span");
    BlogCTLPopup.setStatus(
      status,
      healthKind(tool.health),
      tool.health?.summary || tool.health?.status || "未知",
      tool.health?.detail || "",
    );
    summary.append(name, status);

    const body = document.createElement("div");
    body.className = "tool-card-body";
    if (tool.description) {
      const description = document.createElement("p");
      description.className = "card-hint";
      description.textContent = tool.description;
      body.append(description);
    }

    const versionText = tool.health?.version ? `版本 v${tool.health.version}` : "";
    const detailText = [versionText, tool.health?.detail, tool.health?.path].filter(Boolean).join(" · ");
    if (detailText) {
      const detail = document.createElement("code");
      detail.className = "path-value";
      detail.textContent = detailText;
      body.append(detail);
    }

    if (tool.config?.toggle) {
      const toggleLabel = document.createElement("label");
      toggleLabel.className = "switch-row";
      const text = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = tool.config.toggle.label;
      const detail = document.createElement("small");
      detail.textContent = tool.config.toggle.description || "";
      text.append(title, detail);
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.dataset.toggleKey = tool.config.toggle.key;
      toggle.checked = Boolean(tool.config.values?.[tool.config.toggle.key]);
      toggleLabel.append(text, toggle);
      body.append(toggleLabel);
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
      const actionRow = document.createElement("div");
      actionRow.className = "tool-actions";
      for (const action of actions) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.textContent = action.label || action.id;
        button.title = action.description || "";
        button.addEventListener("click", () => runToolAction(tool, action, button));
        actionRow.append(button);
      }
      body.append(actionRow);
    }

    card.append(summary, body);
    return card;
  }

  function renderToolList(container, tools, emptyText = "") {
    container.replaceChildren();
    for (const tool of tools) container.append(createToolCard(tool));
    if (!container.childElementCount && emptyText) {
      const empty = document.createElement("div");
      empty.className = "platform-loading";
      empty.textContent = emptyText;
      container.append(empty);
    }
  }

  function renderSearchEngineStatus(tools) {
    if (!tools.length) {
      BlogCTLPopup.setStatus(searchEngineStatus, "unknown", "无配置");
      return;
    }
    const healthy = tools.filter((tool) => tool.health?.ok).length;
    const failed = tools.filter((tool) =>
      tool.health?.status === "missing" || tool.health?.status === "error"
    ).length;
    if (healthy === tools.length) {
      BlogCTLPopup.setStatus(searchEngineStatus, "ok", `${healthy} / ${tools.length} 可用`);
      return;
    }
    if (failed > 0) {
      BlogCTLPopup.setStatus(searchEngineStatus, "error", `${healthy} / ${tools.length} 可用`);
      return;
    }
    BlogCTLPopup.setStatus(searchEngineStatus, "unknown", `${healthy} / ${tools.length} 可用`);
  }

  function renderTools() {
    const tools = state.tools.filter((item) => item.kind !== "publishing");
    const searchNames = new Set(["bing-indexnow", "google-search-console-api"]);
    const searchTools = tools.filter((item) => searchNames.has(item.name));
    const dependencyItems = tools.filter((item) => item.kind === "dependency");
    const runtimeItems = tools.filter((item) =>
      item.kind !== "dependency" && !searchNames.has(item.name)
    );

    if (!initializedExpansion) {
      for (const tool of tools) {
        if (tool.config?.defaultExpanded) expandedTools.add(tool.name);
      }
      initializedExpansion = true;
      persistExpandedTools();
    }

    renderToolList(runtimeTools, runtimeItems, "没有运行环境信息");
    renderToolList(searchEngineTools, searchTools, "没有搜索引擎配置");
    renderToolList(dependencyTools, dependencyItems);
    renderSearchEngineStatus(searchTools);
  }

  async function refresh() {
    if (!state.active) return;
    BlogCTLPopup.setMessage(message);
    try {
      const toolsResponse = await BlogCTLPopup.send("blogctl.tools");
      state.tools = toolsResponse.tools ?? [];
      renderTools();
      BlogCTLPopup.refreshBridgeIndicator().catch(() => {});
    } catch (error) {
      runtimeTools.innerHTML = '<div class="platform-loading">环境读取失败</div>';
      searchEngineTools.innerHTML = '<div class="platform-loading">环境读取失败</div>';
      dependencyTools.replaceChildren();
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      BlogCTLPopup.refreshBridgeIndicator().catch(() => {});
    }
  }
  function init() {
    if (state.initialized) return;
    runtimeTools = document.getElementById("environmentRuntimeTools");
    searchEngineTools = document.getElementById("searchEngineTools");
    dependencyTools = document.getElementById("environmentDependencyTools");
    searchEngineStatus = document.getElementById("searchEngineEnvironmentStatus");
    platformConfigCard = document.getElementById("platformConfigEnvironmentCard");
    searchEngineCard = document.getElementById("searchEngineEnvironmentCard");
    message = document.getElementById("environmentMessage");

    BlogCTLPublishing.init();
    trackExpansion(platformConfigCard, "platform-config");
    trackExpansion(searchEngineCard, "search-engines");
    state.initialized = true;
  }
  function activate() {
    state.active = true;
    BlogCTLPublishing.activate();
    refresh();
  }
  function deactivate() {
    state.active = false;
    BlogCTLPublishing.deactivate();
  }
  root.BlogCTLEnvironment = { init, activate, deactivate, refresh };
})(globalThis);
