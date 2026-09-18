"use strict";

(function (root) {
  function deliveryToolAvailability(platformId, tools = []) {
    if (platformId !== "devto") return { available: true, reason: "" };
    const tool = tools.find((item) => item.name === "devto-api");
    if (!tool) return { available: false, reason: "DEV.to API 状态未知" };
    if (tool.health?.ok) return { available: true, reason: "" };
    return { available: false, reason: tool.health?.summary || "DEV.to API Key 未配置" };
  }

  const PUBLISHER_AUTH_PLATFORMS = new Set([
    "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao", "devto",
  ]);

  function platformAvailability(article, platform, publishingProfile = {}) {
    if (platform && typeof platform === "object" && !PUBLISHER_AUTH_PLATFORMS.has(platform.id)) {
      if (platform.known === false) return { available: false, reason: "登录状态检测失败" };
      if (!platform.loggedIn) return { available: false, reason: "未登录" };
    }
    if (!article) return { available: true, reason: "" };
    const language = publishingProfile.language || "zh-CN";
    if (language === "en" && !article.englishMirror) {
      return { available: false, reason: "缺少英文版本" };
    }
    return { available: true, reason: "" };
  }

  const resultLabels = {
    completed: "完成",
    created: "已创建",
    updated: "已更新",
    skipped: "无变化",
    "dry-run": "Dry Run 完成",
    "draft-created": "草稿已创建",
    published: "已发布",
    "waiting-for-session": "等待 Session",
    "rate-limit-retry": "等待限流重试",
  };

  function statePresentation(state, result = "") {
    if (state === "queued") return { kind: "unknown", label: "排队" };
    if (state === "running") return { kind: "checking", label: "运行中" };
    if (state === "waiting") return { kind: "checking", label: resultLabels[result] || "等待" };
    if (state === "completed") return { kind: "ok", label: resultLabels[result] || "完成" };
    if (state === "failed") return { kind: "error", label: "失败" };
    return { kind: "unknown", label: state || "未知" };
  }

  function platformLabel(status, id) {
    return (status?.platforms ?? []).find((item) => item.id === id)?.label || id;
  }

  function fallbackResult(job, platform) {
    if (job?.state === "failed") return { state: "failed", error: job.error || "同步失败" };
    if (job?.state === "completed") return { state: "completed", result: "completed" };
    if (job?.state === "running") return { state: "running" };
    return { state: "queued" };
  }

  function platformRows(job, status) {
    return (job?.platforms ?? []).map((platform) => {
      const result = job?.results?.[platform] || fallbackResult(job, platform);
      const presentation = statePresentation(result.state, result.result);
      return {
        id: platform,
        label: platformLabel(status, platform),
        state: result.state || "unknown",
        result: result.result || "",
        url: result.url || "",
        error: result.error || "",
        message: result.message || "",
        kind: presentation.kind,
        statusLabel: presentation.label,
      };
    });
  }

  root.BlogCTLSyncModel = { deliveryToolAvailability, platformRows, statePresentation, platformAvailability };
})(globalThis);
