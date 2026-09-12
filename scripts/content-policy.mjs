// Import only explicitly reviewed source subtrees. Never widen this to the VNote root.
export const IMPORT_ENABLED = true;
export const PUBLIC_NOTEBOOKS = [
  "Java/JUC",
  "System_Design/分布式系统",
  "System_Design",
  "Database/MySQL",
  "Redis",
  "Search_Server/Elasticsearch",
  "Message_Queue/Kafka",
  "Zookeeper",
];
export const PROMOTED_ARTICLES = [];
export const FEATURED_PATHS = new Set();
export const CATEGORY_LABELS = {
  "Java/JUC": "Java / JUC",
  "System_Design/分布式系统": "分布式系统",
  System_Design: "系统设计",
  "Database/MySQL": "MySQL / Database",
  Redis: "Redis / Cache",
  "Search_Server/Elasticsearch": "Elasticsearch / Search",
  "Message_Queue/Kafka": "Kafka / Message Queue",
  Zookeeper: "ZooKeeper",
};
export const CATEGORY_SLUGS = {
  "System_Design/分布式系统": "distributed-systems",
  System_Design: "system-design",
  "Database/MySQL": "mysql-database",
  Redis: "redis-cache",
  "Search_Server/Elasticsearch": "elasticsearch-search",
  "Message_Queue/Kafka": "kafka-message-queue",
  Zookeeper: "zookeeper",
};
export const ROOT_TOPIC_LABELS = {
  "System_Design/分布式系统": "基础与专题",
  System_Design: "方法论",
  "Database/MySQL": "基础与专题",
  Redis: "基础与专题",
  "Search_Server/Elasticsearch": "基础与专题",
  "Message_Queue/Kafka": "基础与专题",
  Zookeeper: "基础与专题",
};
// Notebooks listed here use a strict per-note allowlist. New or previously rejected
// source files stay private until they receive an explicit content review.
export const REVIEWED_NOTE_PATHS = {
  System_Design: new Set([
    "System_Design/业务系统设计分析思路.md",
    "System_Design/如何处理海量数据.md",
    "System_Design/如何设计高可用系统.md",
    "System_Design/如何设计高并发系统.md",
    "System_Design/数据模型.md",
    "System_Design/服务扩容.md",
    "System_Design/软件系统技术规划方法论.md",
    "System_Design/重构.md",
    "System_Design/技术组件/如何设计TCP连接池.md",
    "System_Design/技术组件/如何设计一个RPC框架.md",
    "System_Design/技术组件/如何设计一个缓存中间件.md",
    "System_Design/技术组件/如何设计一个限流系统.md",
    "System_Design/技术组件/如何设计开放API接口.md",
    "System_Design/技术组件/如何设计池化技术.md",
    "System_Design/技术组件/如何设计缓存系统.md",
    "System_Design/技术组件/如何设计超时与重试系统.md",
    "System_Design/技术组件/如何设计错误系统.md",
  ]),
};
export const NEVER_PUBLISH = new Set(["Others", "Interview", "公司", "_v_recycle_bin", ".obsidian"]);
export const EXCLUDED_NOTE_PATHS = new Set([
  "Java/JUC/14.ThreadPool/线程池数目估算.md",
  "Java/JUC/例子/多线程统计文件夹大小.md",
  "Redis/attachments/20200922234136161_12958/集群.md",
]);
