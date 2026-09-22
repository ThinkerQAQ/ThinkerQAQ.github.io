"use strict";

const modules = {
  sync: BlogCTLSync,
  publications: BlogCTLPublications,
  tasks: BlogCTLTasks,
  publishing: BlogCTLPublishing,
  environment: BlogCTLEnvironment,
};

const ACTIVE_TAB_KEY = "blogctl.activeTab";
let activeTab = "sync";

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
  document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;
  Object.values(modules).forEach((module) => module.init());

  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  document.getElementById("refresh").addEventListener("click", refreshActiveTab);
  BlogCTLPopup.refreshBridgeIndicator().catch(() => {});
  const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
  activateTab(modules[savedTab] ? savedTab : "sync");
});

window.addEventListener("unload", () => {
  Object.values(modules).forEach((module) => module.deactivate());
});
