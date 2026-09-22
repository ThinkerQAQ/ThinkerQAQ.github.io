"use strict";

(function (root) {
  const state = { initialized: false, active: false, records: [], articles: [], platforms: [] };
  let queryInput, platformSelect, statusSelect, summary, list, message;

  const labelForPlatform = (id) => state.platforms.find((item) => item.id === id)?.label || id;
  const titleForArticle = (slug) => state.articles.find((item) => item.slug === slug)?.title || slug;

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
      if (links.childElementCount) card.append(links);

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
