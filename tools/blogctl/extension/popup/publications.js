"use strict";

(function (root) {
  const state = {
    initialized: false,
    active: false,
    records: [],
    articles: [],
    platforms: [],
    reconciliations: {},
    reconciling: new Set(),
  };
  let queryInput, platformSelect, statusSelect, summary, list, message;

  const labelForPlatform = (id) => state.platforms.find((item) => item.id === id)?.label || id;
  const titleForArticle = (slug) => state.articles.find((item) => item.slug === slug)?.title || slug;

  const platformProfile = (id) => state.platforms.find((item) => item.id === id) || {};
  const recordKey = (record) => `${record.article}\u0000${record.platform}`;

  function reconciliationPresentation(reconciliation) {
    switch (reconciliation?.status) {
      case "remote-draft": return { kind: "ok", label: "远端草稿" };
      case "remote-published": return { kind: "ok", label: "远端已发布" };
      case "remote-state-changed": return { kind: "error", label: "远端有变化" };
      case "remote-missing": return { kind: "error", label: "远端缺失" };
      default: return { kind: "unknown", label: "仅本地记录" };
    }
  }

  function recordState(record) {
    return record.publishedUrl ? "published" : "draft";
  }

  function filteredRecords() {
    const query = queryInput.value.trim().toLowerCase();
    const platform = platformSelect.value;
    const status = statusSelect.value;
    return state.records.filter((record) => {
      if (platform && record.platform !== platform) return false;
      if (status && recordState(record) !== status) return false;
      if (!query) return true;
      const haystack = [
        record.article,
        titleForArticle(record.article),
        record.platform,
        labelForPlatform(record.platform),
        record.remoteId,
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  function appendLink(container, label, href) {
    if (!href) return;
    const link = document.createElement("a");
    link.className = "job-result-link";
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = label;
    container.append(link);
  }

  async function reconcileRecord(record) {
    const key = recordKey(record);
    if (state.reconciling.has(key)) return;
    state.reconciling.add(key);
    render();
    BlogCTLPopup.setMessage(message, `正在核验 ${labelForPlatform(record.platform)} 远端状态…`);
    try {
      const response = await BlogCTLPopup.send("blogctl.publication.reconcile", {
        article: record.article,
        platform: record.platform,
      });
      if (response.reconciliation) state.reconciliations[key] = response.reconciliation;
      BlogCTLPopup.setMessage(message, "远端核验完成。", "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(message, `远端核验失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    } finally {
      state.reconciling.delete(key);
      render();
    }
  }

  function render() {
    const records = filteredRecords();
    const drafts = state.records.filter((record) => !record.publishedUrl && record.draftUrl).length;
    const published = state.records.filter((record) => Boolean(record.publishedUrl)).length;
    summary.textContent = `共 ${state.records.length} 条平台记录 · 草稿 ${drafts} · 已发布 ${published} · 当前显示 ${records.length}`;
    list.replaceChildren();

    if (!records.length) {
      list.innerHTML = '<div class="platform-loading">没有匹配的草稿或发布记录</div>';
      return;
    }

    for (const record of records) {
      const card = document.createElement("div");
      card.className = "publication-item";

      const head = document.createElement("div");
      head.className = "job-platform-main";
      const title = document.createElement("strong");
      title.textContent = titleForArticle(record.article);
      const status = document.createElement("span");
      BlogCTLPopup.setStatus(status, record.publishedUrl ? "ok" : "unknown", record.publishedUrl ? "已发布" : "草稿");
      head.append(title, status);
      card.append(head);

      const meta = document.createElement("div");
      meta.className = "job-meta";
      meta.textContent = [labelForPlatform(record.platform), record.article, record.remoteId ? `ID ${record.remoteId}` : ""].filter(Boolean).join(" · ");
      card.append(meta);

      const links = document.createElement("div");
      links.className = "publication-links";
      appendLink(links, "打开草稿", record.draftUrl);
      appendLink(links, "打开已发布文章", record.publishedUrl);

      const key = recordKey(record);
      const profile = platformProfile(record.platform);
      const reconciliation = state.reconciliations[key];
      if (profile.capabilities?.remoteList === true) {
        const reconcile = document.createElement("button");
        reconcile.type = "button";
        reconcile.className = "secondary compact";
        reconcile.textContent = reconciliation ? "重新核验" : "远端核验";
        reconcile.disabled = state.reconciling.has(key);
        reconcile.addEventListener("click", () => reconcileRecord(record));
        links.append(reconcile);
      }
      if (links.childElementCount) card.append(links);

      if (reconciliation) {
        const verification = document.createElement("div");
        verification.className = "job-platform-main";
        const badge = document.createElement("span");
        const presentation = reconciliationPresentation(reconciliation);
        BlogCTLPopup.setStatus(badge, presentation.kind, presentation.label);
        verification.append(badge);
        const detail = document.createElement("small");
        detail.className = reconciliation.status === "remote-state-changed" || reconciliation.status === "remote-missing"
          ? "job-platform-message error-text"
          : "job-platform-message";
        detail.textContent = [
          reconciliation.message || "",
          reconciliation.verifiedAt ? `核验于 ${BlogCTLPopup.formatTime(reconciliation.verifiedAt)}` : "",
        ].filter(Boolean).join(" · ");
        if (detail.textContent) verification.append(detail);
        card.append(verification);
      } else if (profile.capabilities?.remoteList !== true) {
        const localOnly = document.createElement("small");
        localOnly.className = "job-platform-message";
        localOnly.textContent = "仅本地记录 · 当前平台尚未接入稳定的远端核验接口";
        card.append(localOnly);
      }

      const updated = record.updatedAt || record.publishedSyncedAt || record.publishedAt || record.draftSyncedAt;
      if (updated) {
        const time = document.createElement("small");
        time.className = "job-platform-message";
        time.textContent = `最近同步 ${BlogCTLPopup.formatTime(updated)}`;
        card.append(time);
      }
      list.append(card);
    }
  }

  function renderPlatformOptions() {
    const previous = platformSelect.value;
    platformSelect.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "全部平台";
    platformSelect.append(all);
    const ids = [...new Set(state.records.map((record) => record.platform))].sort();
    for (const id of ids) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = labelForPlatform(id);
      platformSelect.append(option);
    }
    if (ids.includes(previous)) platformSelect.value = previous;
  }

  async function refresh() {
    if (!state.active) return;
    BlogCTLPopup.setMessage(message);
    try {
      const [publications, articles, publishing] = await Promise.all([
        BlogCTLPopup.send("blogctl.publications"),
        BlogCTLPopup.send("blogctl.articles"),
        BlogCTLPopup.send("blogctl.publishing"),
      ]);
      state.records = publications.records ?? [];
      state.articles = articles.articles ?? [];
      state.platforms = publishing.platforms ?? [];
      state.reconciliations = {};
      state.reconciling.clear();
      renderPlatformOptions();
      render();
      await BlogCTLPopup.refreshBridgeIndicator();
    } catch (error) {
      BlogCTLPopup.setMessage(message, `读取草稿与发布记录失败：${BlogCTLPopup.errorMessage(error)}`, "error");
    }
  }

  function init() {
    if (state.initialized) return;
    queryInput = document.getElementById("publicationQuery");
    platformSelect = document.getElementById("publicationPlatform");
    statusSelect = document.getElementById("publicationStatus");
    summary = document.getElementById("publicationSummary");
    list = document.getElementById("publicationList");
    message = document.getElementById("publicationsMessage");
    queryInput.addEventListener("input", render);
    platformSelect.addEventListener("change", render);
    statusSelect.addEventListener("change", render);
    state.initialized = true;
  }

  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }

  root.BlogCTLPublications = { init, activate, deactivate, refresh };
})(globalThis);
