"use strict";

const modules = {
  binding: BlogCTLSync,
  drafts: BlogCTLDrafts,
  publications: BlogCTLPublications,
  tasks: BlogCTLTasks,
  indexing: BlogCTLIndexing,
  publishing: BlogCTLPublishing,
  environment: BlogCTLEnvironment,
};

const ACTIVE_TAB_KEY = "blogctl.activeTab";
let activeTab = "binding";

function activateTab(name) {
  if (!modules[name]) return;

  document.querySelectorAll("[data-tab]").forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.tabIndex = active ? 0 : -1;
  });

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === name);
  });

  modules[activeTab]?.deactivate();
  activeTab = name;
  localStorage.setItem(ACTIVE_TAB_KEY, name);
  modules[name].activate();
}

async function refreshActiveTab() {
  BlogCTLPopup.refreshBridgeIndicator().catch(() => {});
  const module = modules[activeTab];
  if (typeof module?.refresh === "function") {
    await module.refresh();
    return;
  }
  module?.deactivate();
  module?.activate();
}

document.addEventListener("DOMContentLoaded", () => {
  Object.values(modules).forEach((module) => module.init());

  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  document.getElementById("refresh").addEventListener("click", refreshActiveTab);
  document.addEventListener("blogctl:navigate-publication", (event) => {
    const article = String(event.detail?.article || "").trim();
    const platform = String(event.detail?.platform || "").trim();
    if (!article || !platform) return;
    BlogCTLPublications.focusRecord(article, platform);
    activateTab("publications");
  });
  document.addEventListener("blogctl:navigate-task", (event) => {
    const jobId = String(event.detail?.jobId || "").trim();
    if (!jobId) return;
    BlogCTLTasks.focusJob(jobId);
    activateTab("tasks");
  });
  document.addEventListener("blogctl:draft-completed", (event) => {
    const article = String(event.detail?.article || "").trim();
    const platforms = Array.isArray(event.detail?.platforms) ? event.detail.platforms : [];
    if (!article || !platforms.length) return;
    BlogCTLPublications.prepare(article, platforms);
    activateTab("publications");
  });
  BlogCTLPopup.refreshBridgeIndicator().catch(() => {});
  const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
  const normalizedTab = savedTab === "sync" ? "binding" : savedTab;
  activateTab(modules[normalizedTab] ? normalizedTab : "binding");
});

window.addEventListener("unload", () => {
  Object.values(modules).forEach((module) => module.deactivate());
});
