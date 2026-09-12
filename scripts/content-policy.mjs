// Import only explicitly reviewed source subtrees. Never widen this to the VNote root.
export const IMPORT_ENABLED = true;
export const PUBLIC_NOTEBOOKS = ["Java/JUC"];
export const PROMOTED_ARTICLES = [];
export const FEATURED_PATHS = new Set();
export const CATEGORY_LABELS = { "Java/JUC": "Java / JUC" };
export const NEVER_PUBLISH = new Set(["Others", "Interview", "公司", "_v_recycle_bin", ".obsidian"]);
export const EXCLUDED_NOTE_PATHS = new Set([
  "Java/JUC/14.ThreadPool/线程池数目估算.md",
  "Java/JUC/例子/多线程统计文件夹大小.md",
]);
