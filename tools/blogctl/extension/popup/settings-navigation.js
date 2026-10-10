"use strict";

// A presentation-only category tree, modeled after IDFlow's SettingsFeature.
// Existing BlogCTL environment controls and Bridge mutations are moved, not
// cloned: the same DOM and handlers work in every UI host.
(function (root) {
  const CATEGORY_META = [
    { id: "content", title: "内容与路径", summary: "TOML 配置文件和内容目录", selectors: [".environment-config-file"] },
    { id: "runtime", title: "运行环境", summary: "Bridge、Extension 与本地依赖", selectors: ["#environmentRuntimeTools", "#environmentDependencyTools"] },
    { id: "platforms", title: "分发平台", summary: "平台策略、Footer、Canonical 和 Tracking", selectors: ["#platformConfigEnvironmentCard"] },
    { id: "assets", title: "素材与渲染", summary: "Mermaid、共享素材和 R2", selectors: ["#assetConfigEnvironmentCard"] },
    { id: "index", title: "搜索引擎", summary: "IndexNow、Baidu 和 Google Search Console", selectors: ["#searchEngineEnvironmentCard"] },
  ];
  let initialized = false;
  let selected = "";
  let search;
  let tree;
  let panes;
  const nodes = new Map();

  function nodeMetaText(meta) {
    const aliases = { content: "config file toml data 路径", runtime: "node go npm chrome bridge",
      platforms: "平台 publish footer canonical tracking", assets: "mermaid png r2 图片",
      index: "baidu bing google sitemap indexnow 索引" };
    return [meta.title, meta.summary, aliases[meta.id] || ""].join(" ").toLowerCase();
  }

  function render() {
    if (!initialized) return;
    const query = search.value.trim().toLowerCase();
    const list = document.createElement("div");
    list.className = "settings-category-list";
    const active = !query ? selected : "";
    for (const meta of CATEGORY_META) {
      if (query && !query.split(/\s+/).every((word) => nodeMetaText(meta).includes(word))) continue;
      if (active && meta.id !== active) continue;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "settings-category-row";
      row.dataset.settingsCategory = meta.id;
      const title = document.createElement("strong");
      title.textContent = meta.title;
      const subtitle = document.createElement("small");
      subtitle.textContent = meta.summary;
      const arrow = document.createElement("span");
      arrow.textContent = "›";
      arrow.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      copy.append(title, subtitle);
      row.append(copy, arrow);
      row.addEventListener("click", () => {
        selected = meta.id;
        search.value = "";
        render();
      });
      list.append(row);
    }
    if (!list.childElementCount) {
      const empty = document.createElement("p");
      empty.className = "card-hint";
      empty.textContent = "没有找到匹配的设置分类";
      list.append(empty);
    }

    const isDetail = Boolean(active);
    const back = document.createElement("button");
    back.type = "button";
    back.className = "secondary compact settings-back";
    back.textContent = "← 返回设置";
    back.hidden = !isDetail;
    back.addEventListener("click", () => { selected = ""; render(); });
    tree.replaceChildren(back);
    if (isDetail) {
      const current = CATEGORY_META.find((item) => item.id === active);
      const heading = document.createElement("h2");
      heading.className = "settings-detail-title";
      heading.textContent = current.title;
      tree.append(heading);
    } else {
      tree.append(list);
    }
    for (const meta of CATEGORY_META) {
      nodes.get(meta.id).hidden = meta.id !== active;
    }
    // Controls remain mounted when navigating, preserving unfinished edits.
  }

  function init() {
    if (initialized) return;
    const panel = document.querySelector('[data-panel="environment"] .status-card');
    if (!panel) return;
    const inputs = CATEGORY_META.map((meta) => ({
      meta, elements: meta.selectors.map((selector) => panel.querySelector(selector)).filter(Boolean),
    }));
    if (inputs.some(({ elements }) => !elements.length)) {
      throw new Error("BlogCTL settings navigation: missing environment sections");
    }
    const intro = document.createElement("p");
    intro.className = "card-hint";
    intro.textContent = "按分类查找设置；点击进入后仍使用现有的编辑、保存和取消操作。";
    const heading = document.createElement("h2");
    heading.className = "settings-heading";
    heading.textContent = "设置";
    search = document.createElement("input");
    search.type = "search";
    search.className = "settings-search";
    search.setAttribute("aria-label", "搜索设置分类");
    search.placeholder = "搜索设置：平台、代理、R2、索引…";
    search.autocomplete = "off";
    search.addEventListener("input", render);
    tree = document.createElement("div");
    tree.className = "settings-tree";
    panes = document.createElement("div");
    panes.className = "settings-category-panes";
    for (const { meta, elements } of inputs) {
      const section = document.createElement("section");
      section.className = "settings-category-pane";
      section.dataset.category = meta.id;
      section.hidden = true;
      for (const element of elements) section.append(element);
      nodes.set(meta.id, section);
      panes.append(section);
    }
    panel.replaceChildren(heading, intro, search, tree, panes);
    initialized = true;
    render();
  }

  root.BlogCTLSettingsNavigation = { init, showCategory(id) {
    selected = CATEGORY_META.some((item) => item.id === id) ? id : "";
    render();
  } };
})(globalThis);
