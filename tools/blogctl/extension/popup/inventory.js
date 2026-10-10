"use strict";

(function (root) {
  const state = { active: false, initialized: false, platforms: [], records: {}, loading: new Set() };
  let container, message, query, refreshButton;
  const visiblePlatforms = () => BlogCTLSyncModel.visiblePlatforms(state.platforms);

  function makeButton(label, callback, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary compact";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", callback);
    return button;
  }

  function render() {
    container.replaceChildren();
    const filter = query.value.trim().toLowerCase();
    for (const platform of visiblePlatforms()) {
      const card = document.createElement("section");
      card.className = "platform-choice-card remote-inventory-card";
      const heading = document.createElement("div");
      heading.className = "job-platform-main";
      const label = document.createElement("strong");
      label.textContent = platform.label || platform.id;
      const result = state.records[platform.id];
      const busy = state.loading.has(platform.id);
      const count = document.createElement("small");
      count.textContent = busy ? "读取中…" : result?.error ? "读取失败"
        : result ? `草稿 ${result.items.filter((item) => !item.published).length} · 已发布 ${result.items.filter((item) => item.published).length}` : "尚未读取";
      heading.append(label, count, makeButton("刷新", () => loadPlatform(platform.id), busy));
      card.append(heading);
      if (result?.error) {
        const error = document.createElement("small");
        error.className = "error-text";
        error.textContent = result.error;
        card.append(error);
      }
      if (result?.partial) {
        const note = document.createElement("small");
        note.className = "card-hint";
        note.textContent = result.partial;
        card.append(note);
      }
      for (const published of [false, true]) {
        const entries = (result?.items ?? []).filter((item) => {
          if (Boolean(item.published) !== published) return false;
          const content = `${item.title} ${item.id} ${published ? "已发布" : "草稿"}`.toLowerCase();
          return !filter || content.includes(filter);
        });
        if (!entries.length) continue;
        const section = document.createElement("details");
        section.className = "remote-inventory-group";
        // Keep large account inventories compact, but expose matches during search.
        section.open = Boolean(filter);
        const summary = document.createElement("summary");
        summary.textContent = `${published ? "已发布文章" : "草稿"} · ${entries.length} 篇`;
        section.append(summary);
        for (const item of entries) {
          const row = document.createElement("div");
          row.className = "article-match-row";
          const name = document.createElement("div");
          name.className = "article-match-choice-text";
          name.textContent = `${item.title || "(无标题)"} · ID ${item.id}`;
          row.append(name);
          const link = BlogCTLSyncModel.articleMatchLink(platform.id, item);
          if (link) {
            const action = document.createElement("a");
            action.textContent = link.label;
            action.href = link.url;
            action.target = "_blank";
            action.rel = "noopener noreferrer";
            row.append(action);
          }
          section.append(row);
        }
        card.append(section);
      }
      if (result && !result.items.length) {
        const empty = document.createElement("p");
        empty.className = "card-hint";
        empty.textContent = "当前读取范围内没有远端文章。";
        card.append(empty);
      }
      container.append(card);
    }
  }

  async function loadPlatform(platform) {
    if (!state.active || state.loading.has(platform)) return;
    state.loading.add(platform);
    render();
    try {
      const response = await BlogCTLPopup.send("blogctl.remote.inventory", { platform });
      state.records[platform] = {
        items: response.items ?? [],
        partial: response.partial || "",
      };
    } catch (error) {
      state.records[platform] = { items: [], error: BlogCTLPopup.errorMessage(error) };
    } finally {
      state.loading.delete(platform);
      if (state.active) render();
    }
  }

  async function refresh() {
    if (!state.active) return;
    try {
      const response = await BlogCTLPopup.send("blogctl.status");
      state.platforms = response.status?.platforms ?? [];
      render();
      // Each remote listing has independent failure and completion semantics.
      await Promise.all(visiblePlatforms().map((platform) => loadPlatform(platform.id)));
    } catch (error) {
      BlogCTLPopup.setMessage(message, BlogCTLPopup.errorMessage(error), "error");
    }
  }

  function init() {
    if (state.initialized) return;
    container = document.getElementById("inventoryPlatforms");
    query = document.getElementById("inventorySearch");
    refreshButton = document.getElementById("refreshInventory");
    message = document.getElementById("inventoryMessage");
    query.addEventListener("input", render);
    refreshButton.addEventListener("click", refresh);
    state.initialized = true;
  }
  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLInventory = { init, activate, deactivate, refresh };
})(globalThis);
