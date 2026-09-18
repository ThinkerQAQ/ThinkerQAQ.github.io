"use strict";

(function (root) {
  const state = { initialized: false, active: false, platforms: [] };
  let platformSelect, languageSelect, footerEnabled, footerTemplate, canonicalMode;
  let trackingEnabled, trackingSource, trackingMedium, trackingCampaign;
  let preview, saveButton, resetButton, message;

  function currentPlatform() {
    return state.platforms.find((platform) => platform.id === platformSelect.value);
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

  function writeForm(platform) {
    const profile = platform || {};
    const fallback = defaultsFor(profile.id || "cnblogs");
    languageSelect.value = profile.language || fallback.language;
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
      const response = await BlogCTLPopup.send("blogctl.publishing.save", { platforms: [current] });
      state.platforms = response.platforms ?? [];
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
    footerEnabled = document.getElementById("footerEnabled");
    footerTemplate = document.getElementById("footerTemplate");
    canonicalMode = document.getElementById("canonicalMode");
    trackingEnabled = document.getElementById("trackingEnabled");
    trackingSource = document.getElementById("trackingSource");
    trackingMedium = document.getElementById("trackingMedium");
    trackingCampaign = document.getElementById("trackingCampaign");
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
    saveButton.addEventListener("click", save);
    resetButton.addEventListener("click", reset);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLPublishing = { init, activate, deactivate, refresh };
})(globalThis);
