"use strict";

(function (root) {
  const state = { initialized: false, active: false, platforms: [], compiler: {}, assets: {}, assetStatus: {}, tools: [] };
  let platformSelect, languageSelect, changedOnly, footerEnabled, footerTemplate, canonicalMode;
  let trackingEnabled, trackingSource, trackingMedium, trackingCampaign;
  let mermaidWidth, mermaidScale, r2Bucket, r2PublicBaseUrl, assetStatus, assetStatusDetail;
  let platformAccessConfig, preview, saveButton, resetButton, message;

  function currentPlatform() {
    return state.platforms.find((platform) => platform.id === platformSelect.value);
  }

  function healthKind(health) {
    if (health?.status === "disabled") return "disabled";
    if (health?.ok) return "ok";
    if (health?.status === "missing" || health?.status === "error") return "error";
    return "unknown";
  }

  function accessToolFor(platformID) {
    if (platformID === "devto") return state.tools.find((tool) => tool.name === "devto-api") ?? null;
    return null;
  }

  function makeAccessInput(tool, field) {
    const label = document.createElement("label");
    label.className = "field";
    const title = document.createElement("span");
    title.textContent = field.label || field.key;
    const input = document.createElement("input");
    input.dataset.configKey = field.key;
    input.type = field.type === "secret" ? "password" : field.type === "integer" ? "number" : "text";
    if (field.type === "secret") input.autocomplete = "off";
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.min) input.min = String(field.min);
    if (field.max) input.max = String(field.max);
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

  async function saveAccessTool(tool, container, button) {
    const values = {};
    container.querySelectorAll("[data-config-key]").forEach((input) => {
      values[input.dataset.configKey] = input.type === "number" ? Number(input.value || 0) : input.value.trim();
    });
    button.disabled = true;
    BlogCTLPopup.setMessage(message, `正在保存 ${tool.displayName || tool.name}…`);
    try {
      const response = await BlogCTLPopup.send("blogctl.tool.save", { name: tool.name, config: values });
      state.tools = response.tools ?? state.tools;
      renderPlatformAccess();
      BlogCTLPopup.setMessage(message, `${tool.displayName || tool.name} 已保存。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
      button.disabled = false;
    }
  }

  function renderPlatformAccess() {
    platformAccessConfig.replaceChildren();
    const platform = currentPlatform();
    if (!platform) {
      platformAccessConfig.innerHTML = '<div class="platform-loading">请选择平台</div>';
      return;
    }

    const tool = accessToolFor(platform.id);
    if (!tool) {
      const note = document.createElement("p");
      note.className = "card-hint";
      note.textContent = platform.capabilities?.browserSession
        ? "此平台使用浏览器登录会话，不需要额外的平台凭据配置。登录状态在“绑定”页查看。"
        : "当前平台没有额外的接入配置。";
      platformAccessConfig.append(note);
      return;
    }

    const card = document.createElement("div");
    card.className = "platform-access-card";
    const head = document.createElement("div");
    head.className = "status-row";
    const name = document.createElement("strong");
    name.textContent = tool.displayName || tool.name;
    const status = document.createElement("span");
    BlogCTLPopup.setStatus(status, healthKind(tool.health), tool.health?.summary || tool.health?.status || "未知");
    head.append(name, status);
    card.append(head);

    if (tool.description) {
      const description = document.createElement("p");
      description.className = "card-hint";
      description.textContent = tool.description;
      card.append(description);
    }

    for (const field of tool.config?.schema ?? []) card.append(makeAccessInput(tool, field));

    if ((tool.config?.schema ?? []).length) {
      const save = document.createElement("button");
      save.type = "button";
      save.className = "secondary full-width";
      save.textContent = "保存接入配置";
      save.addEventListener("click", () => saveAccessTool(tool, card, save));
      card.append(save);
    }

    platformAccessConfig.append(card);
  }

  function defaultFooterTemplate(language) {
    return language === "en"
      ? "> This article was first published on [{site}]({url}) and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version."
      : "> 本文首发于 [{site}]({url})，由作者本人同步发布。原文可能持续修订，最新版本请以个人博客为准。";
  }

  function defaultsFor(platform) {
    const english = platform === "devto" || platform === "medium";
    return {
      language: english ? "en" : "zh-CN",
      changedOnly: false,
      footer: {
        enabled: true,
        template: defaultFooterTemplate(english ? "en" : "zh-CN"),
      },
      canonical: { mode: english ? "native" : "footer" },
      tracking: {
        enabled: true,
        source: platform,
        medium: "referral",
        campaign: "article_syndication",
      },
    };
  }

  function trackedUrl() {
    const prefix = languageSelect.value === "en" ? "/en/articles/" : "/articles/";
    const url = new URL(`https://thinkerqaq.github.io${prefix}example/`);
    if (!trackingEnabled.checked) return url.toString();
    const values = {
      utm_source: trackingSource.value.trim(),
      utm_medium: trackingMedium.value.trim(),
      utm_campaign: trackingCampaign.value.trim(),
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  }

  function updatePreview() {
    const canonicalLabels = {
      native: "Native canonical",
      footer: "Footer backlink",
      none: "Disabled",
    };
    const languageLabel = languageSelect.value === "en" ? "English" : "中文";
    const lines = [`内容语言: ${languageLabel}`, `Canonical: ${canonicalLabels[canonicalMode.value] || canonicalMode.value}`];
    if (!footerEnabled.checked) {
      lines.push("Footer: 已关闭");
      preview.textContent = lines.join("\n\n");
      return;
    }
    const english = languageSelect.value === "en";
    const rendered = footerTemplate.value
      .replaceAll("{site}", english ? "ThinkerQAQ's personal blog" : "ThinkerQAQ 的个人博客")
      .replaceAll("{title}", english ? "Example article" : "示例文章")
      .replaceAll("{url}", trackedUrl())
      .trim();
    lines.push(rendered || "Footer 模板为空。");
    preview.textContent = lines.join("\n\n");
  }

  function writeAssetForm() {
    const mermaid = state.compiler?.mermaid ?? {};
    const r2 = state.assets?.r2 ?? {};
    mermaidWidth.value = Number(mermaid.width || 1200);
    mermaidScale.value = Number(mermaid.scale || 2);
    r2Bucket.value = r2.bucket || "";
    r2PublicBaseUrl.value = r2.publicBaseUrl || "";

    const ready = Boolean(state.assetStatus?.ready);
    BlogCTLPopup.setStatus(assetStatus, ready ? "ok" : "error", ready ? "可上传" : "配置不完整");
    const missing = state.assetStatus?.missing ?? [];
    assetStatusDetail.textContent = ready
      ? "Mermaid 会渲染为 PNG 上传到 R2；平台支持时会继续上传到各自图床。"
      : `缺少：${missing.join("、") || "未知配置"}。保存 Bucket / Public Base URL 后，如仍缺凭据，请重启带有对应 R2 环境变量的 Bridge。`;
  }

  function readAssetForm() {
    return {
      compiler: {
        mermaid: {
          format: "png",
          width: Number(mermaidWidth.value || 1200),
          scale: Number(mermaidScale.value || 2),
        },
      },
      assets: {
        store: "r2",
        r2: {
          bucket: r2Bucket.value.trim(),
          publicBaseUrl: r2PublicBaseUrl.value.trim(),
        },
      },
    };
  }

  function writeForm(platform) {
    const profile = platform || {};
    const fallback = defaultsFor(profile.id || "cnblogs");
    languageSelect.value = profile.language || fallback.language;
    const canUpdateDraft = profile.capabilities?.draftUpdate !== false;
    changedOnly.checked = canUpdateDraft && Boolean(profile.changedOnly);
    changedOnly.disabled = !canUpdateDraft;
    changedOnly.title = changedOnly.disabled ? "当前平台尚未验证安全更新已有草稿。" : "";
    const footer = profile.footer || fallback.footer;
    const canonical = profile.canonical || fallback.canonical;
    const tracking = profile.tracking || fallback.tracking;
    footerEnabled.checked = Boolean(footer.enabled);
    footerTemplate.value = footer.template || "";
    canonicalMode.value = canonical.mode || fallback.canonical.mode;
    trackingEnabled.checked = Boolean(tracking.enabled);
    trackingSource.value = tracking.source || "";
    trackingMedium.value = tracking.medium || "";
    trackingCampaign.value = tracking.campaign || "";
    updatePreview();
  }

  function readForm() {
    const platform = currentPlatform();
    if (!platform) return null;
    return {
      id: platform.id,
      label: platform.label,
      language: languageSelect.value,
      changedOnly: changedOnly.checked,
      footer: {
        enabled: footerEnabled.checked,
        template: footerTemplate.value.trim(),
      },
      canonical: { mode: canonicalMode.value },
      tracking: {
        enabled: trackingEnabled.checked,
        source: trackingSource.value.trim(),
        medium: trackingMedium.value.trim(),
        campaign: trackingCampaign.value.trim(),
      },
    };
  }

  function renderPlatformSelect() {
    const previous = platformSelect.value;
    platformSelect.replaceChildren();
    for (const platform of state.platforms) {
      const option = document.createElement("option");
      option.value = platform.id;
      option.textContent = platform.label || platform.id;
      platformSelect.append(option);
    }
    if (state.platforms.some((platform) => platform.id === previous)) platformSelect.value = previous;
    if (!platformSelect.value && state.platforms.length) platformSelect.value = state.platforms[0].id;
    writeForm(currentPlatform());
  }

  async function save() {
    const current = readForm();
    if (!current) return;
    if (current.footer.enabled && !current.footer.template) {
      BlogCTLPopup.setMessage(message, "启用 Footer 时模板不能为空。", "error");
      return;
    }
    if (current.tracking.enabled && !current.tracking.source) {
      BlogCTLPopup.setMessage(message, "启用 Tracking 时 Source 不能为空。", "error");
      return;
    }
    saveButton.disabled = true;
    BlogCTLPopup.setMessage(message, "正在保存发布配置…");
    try {
      const runtime = readAssetForm();
      const response = await BlogCTLPopup.send("blogctl.publishing.save", {
        platforms: [current],
        compiler: runtime.compiler,
        assets: runtime.assets,
      });
      state.platforms = response.platforms ?? [];
      state.compiler = response.compiler ?? state.compiler;
      state.assets = response.assets ?? state.assets;
      state.assetStatus = response.assetStatus ?? state.assetStatus;
      writeAssetForm();
      renderPlatformSelect();
      platformSelect.value = current.id;
      writeForm(currentPlatform());
      BlogCTLPopup.setMessage(message, `${current.label || current.id} 发布配置已保存。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    } finally {
      saveButton.disabled = false;
    }
  }

  function reset() {
    const platform = currentPlatform();
    if (!platform) return;
    writeForm({ id: platform.id, label: platform.label, ...defaultsFor(platform.id) });
    BlogCTLPopup.setMessage(message, "已恢复默认值；点击“保存”后写入本机配置。");
  }

  async function refresh() {
    if (!state.active) return;
    BlogCTLPopup.setMessage(message);
    try {
      const response = await BlogCTLPopup.send("blogctl.publishing");
      state.platforms = response.platforms ?? [];
      state.compiler = response.compiler ?? {};
      state.assets = response.assets ?? {};
      state.assetStatus = response.assetStatus ?? {};
      writeAssetForm();
      renderPlatformSelect();
      await BlogCTLPopup.refreshBridgeIndicator();
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    }
  }

  function init() {
    if (state.initialized) return;
    platformSelect = document.getElementById("publishingPlatform");
    languageSelect = document.getElementById("publishingLanguage");
    changedOnly = document.getElementById("publishingChangedOnly");
    footerEnabled = document.getElementById("footerEnabled");
    footerTemplate = document.getElementById("footerTemplate");
    canonicalMode = document.getElementById("canonicalMode");
    trackingEnabled = document.getElementById("trackingEnabled");
    trackingSource = document.getElementById("trackingSource");
    trackingMedium = document.getElementById("trackingMedium");
    trackingCampaign = document.getElementById("trackingCampaign");
    mermaidWidth = document.getElementById("mermaidWidth");
    mermaidScale = document.getElementById("mermaidScale");
    r2Bucket = document.getElementById("r2Bucket");
    r2PublicBaseUrl = document.getElementById("r2PublicBaseUrl");
    assetStatus = document.getElementById("assetStatus");
    assetStatusDetail = document.getElementById("assetStatusDetail");
    preview = document.getElementById("publishingPreview");
    saveButton = document.getElementById("savePublishing");
    resetButton = document.getElementById("resetPublishing");
    message = document.getElementById("publishingMessage");

    platformSelect.addEventListener("change", () => writeForm(currentPlatform()));
    languageSelect.addEventListener("change", () => {
      const currentTemplate = footerTemplate.value.trim();
      const defaultTemplates = new Set([defaultFooterTemplate("zh-CN"), defaultFooterTemplate("en")]);
      if (defaultTemplates.has(currentTemplate)) {
        footerTemplate.value = defaultFooterTemplate(languageSelect.value);
      }
      updatePreview();
    });
    for (const element of [footerEnabled, footerTemplate, canonicalMode, trackingEnabled, trackingSource, trackingMedium, trackingCampaign]) {
      element.addEventListener(element.tagName === "SELECT" || element.type === "checkbox" ? "change" : "input", updatePreview);
    }
    for (const element of [mermaidWidth, mermaidScale, r2Bucket, r2PublicBaseUrl]) {
      element.addEventListener("input", () => BlogCTLPopup.setMessage(message));
    }
    saveButton.addEventListener("click", save);
    resetButton.addEventListener("click", reset);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLPublishing = { init, activate, deactivate, refresh };
})(globalThis);
