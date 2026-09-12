// Import only explicitly reviewed source subtrees. Never widen this to the VNote root.
export const IMPORT_ENABLED = true;
export const PUBLIC_NOTEBOOKS = [
  "Java/JUC",
  "System_Design/分布式系统",
  "Database/MySQL",
  "Redis",
  "Search_Server/Elasticsearch",
  "Message_Queue/Kafka",
];
export const PROMOTED_ARTICLES = [];
export const FEATURED_PATHS = new Set();
export const CATEGORY_LABELS = {
  "Java/JUC": "Java / JUC",
  "System_Design/分布式系统": "分布式系统",
  "Database/MySQL": "MySQL / Database",
  Redis: "Redis / Cache",
  "Search_Server/Elasticsearch": "Elasticsearch / Search",
  "Message_Queue/Kafka": "Kafka / Message Queue",
};
export const CATEGORY_SLUGS = {
  "System_Design/分布式系统": "distributed-systems",
  "Database/MySQL": "mysql-database",
  Redis: "redis-cache",
  "Search_Server/Elasticsearch": "elasticsearch-search",
  "Message_Queue/Kafka": "kafka-message-queue",
};
export const ROOT_TOPIC_LABELS = {
  "System_Design/分布式系统": "基础与专题",
  "Database/MySQL": "基础与专题",
  Redis: "基础与专题",
  "Search_Server/Elasticsearch": "基础与专题",
  "Message_Queue/Kafka": "基础与专题",
};
export const NEVER_PUBLISH = new Set(["Others", "Interview", "公司", "_v_recycle_bin", ".obsidian"]);
export const EXCLUDED_NOTE_PATHS = new Set([
  "Java/JUC/14.ThreadPool/线程池数目估算.md",
  "Java/JUC/例子/多线程统计文件夹大小.md",
  "Redis/attachments/20200922234136161_12958/集群.md",
]);
