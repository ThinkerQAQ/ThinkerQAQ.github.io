import type { Locale } from "../config/i18n";

const CATEGORY_LABELS_EN: Record<string, string> = {
  algorithm: "Data Structures & Algorithms",
  "algorithm-concurrent": "Concurrency Algorithms",
  "computer-architecture-assembly": "Computer Architecture & Assembly",
  "computer-network": "Computer Networks",
  container: "Docker / Kubernetes",
  database: "Databases",
  "developer-tools": "Developer Tools",
  "distributed-systems": "Distributed Systems",
  economics: "Economics",
  "elasticsearch-search": "Elasticsearch / Search",
  "garbage-collection": "Garbage Collection / Runtime",
  go: "Go",
  investing: "Investing",
  java: "Java",
  "message-queue": "Message Queues",
  observability: "Observability",
  "operating-system": "Operating Systems / Linux",
  photography: "Photography",
  "redis-cache": "Redis / Cache",
  security: "Security",
  "software-engineering": "Software Architecture & Engineering",
  "system-design": "System Design",
  "testing-performance": "Testing & Performance",
  "web-server-nginx": "Web Servers / Nginx",
  zookeeper: "ZooKeeper",
};

const ROOT_TOPIC_LABELS_EN: Record<string, string> = {
  algorithm: "Overview",
  "computer-architecture-assembly": "Fundamentals",
  "computer-network": "Fundamentals",
  container: "Fundamentals",
  database: "Database",
  "distributed-systems": "Fundamentals & Topics",
  "elasticsearch-search": "Fundamentals & Topics",
  "garbage-collection": "Fundamentals",
  go: "Language",
  "message-queue": "Fundamentals",
  "operating-system": "Overview",
  "redis-cache": "Fundamentals & Topics",
  "software-engineering": "Architecture",
  "system-design": "Methodology",
  zookeeper: "Fundamentals & Topics",
};

const TOPIC_LABELS_EN: Record<string, string> = {
  algorithms: "Algorithms",
  architecture: "Architecture",
  concurrency: "Concurrency",
  "data-structures": "Data Structures",
  "design-patterns": "Design Patterns",
  "design-principles": "Design Principles",
  fundamentals: "Fundamentals",
  http: "HTTP & WebSocket",
  "io-syscalls": "I/O & System Calls",
  "isolation-containers": "Isolation & Containers",
  language: "Language",
  memory: "Memory",
  modeling: "Modeling",
  "network-services": "Network Services",
  overview: "Overview",
  "performance-diagnostics": "Performance & Diagnostics",
  performance: "Performance",
  "platform-services": "Microservices & Platform",
  "processes-concurrency": "Processes & Concurrency",
  "programming-patterns": "Programming Patterns",
  runtime: "Runtime",
  transport: "Transport Layer",
  tuning: "Tuning",

  "分布式": "Distributed Systems",
  "分布式事务": "Distributed Transactions",
  "分布式系统分区": "Partitioning",
  "分布式系统复制": "Replication",
  "分布式一致性算法": "Consensus Algorithms",
  "技术组件": "Technical Components",
  "内存管理": "Memory Management",
  "使用": "Usage",
  "线程模型": "Thread Model",
  "原理": "Internals",
  "源码分析": "Source Code Analysis",
  "泛型": "Generics",
  "内存": "Memory",
  "寄存器": "Registers",
  "磁盘": "Storage",
  "缓存": "Cache",
  "数据结构": "Data Structures",
  "算法": "Algorithms",
  "事务": "Transactions",
  "索引": "Indexes",
  "锁": "Locking",
  "日志": "Logging",
  "主从复制": "Replication",
  "集群": "Clustering",
  "持久化": "Persistence",
  "网络": "Networking",
  "进程": "Processes",
  "线程": "Threads",
  "系统调用": "System Calls",
  "虚拟化": "Virtualization",
  "性能调优": "Performance Tuning",
  "命令": "Commands",
  "并发": "Concurrency",
  "反射": "Reflection",
  "异常": "Exceptions",
};

const SOURCE_LABELS_EN: Record<string, string> = {
  "基础与专题": "Fundamentals & Topics",
  "方法论": "Methodology",
  "基础": "Fundamentals",
  "传输层": "Transport Layer",
  "网络服务": "Network Services",
  "HTTP 与 WebSocket": "HTTP & WebSocket",
  "分布式": "Distributed Systems",
  "分布式事务": "Distributed Transactions",
  "分布式系统分区": "Partitioning",
  "分布式系统复制": "Replication",
  "分布式一致性算法": "Consensus Algorithms",
  "技术组件": "Technical Components",
  "内存管理": "Memory Management",
  "使用": "Usage",
  "线程模型": "Thread Model",
  "原理": "Internals",
  "源码分析": "Source Code Analysis",
  "泛型": "Generics",
  "内存": "Memory",
  "寄存器": "Registers",
  "磁盘": "Storage",
  "缓存": "Cache",
  "数据结构": "Data Structures",
  "算法": "Algorithms",
  "事务": "Transactions",
  "索引": "Indexes",
  "锁": "Locking",
  "日志": "Logging",
  "主从复制": "Replication",
  "集群": "Clustering",
  "持久化": "Persistence",
  "网络": "Networking",
  "进程": "Processes",
  "线程": "Threads",
  "系统调用": "System Calls",
  "虚拟化": "Virtualization",
  "性能调优": "Performance Tuning",
  "命令": "Commands",
  "并发": "Concurrency",
  "反射": "Reflection",
  "异常": "Exceptions",
};

function splitNumericPrefix(label: string): { prefix: string; value: string } {
  const match = label.match(/^((?:\d+\.)+\s*)(.+)$/);
  return match ? { prefix: match[1]!, value: match[2]!.trim() } : { prefix: "", value: label.trim() };
}

function fallbackTopicLabel(id: string, label: string): string {
  const source = label || id;
  return source.replaceAll("_", " ");
}

export function localizeNoteCategoryLabel(
  category: string,
  label: string,
  locale: Locale,
): string {
  if (locale !== "en") return label;
  return CATEGORY_LABELS_EN[category] ?? label;
}

export function localizeNoteTopicLabel(
  category: string,
  id: string,
  label: string,
  locale: Locale,
): string {
  if (locale !== "en") return label;

  const { prefix, value } = splitNumericPrefix(label);
  const translated = id === "__root"
    ? ROOT_TOPIC_LABELS_EN[category] ?? SOURCE_LABELS_EN[value]
    : TOPIC_LABELS_EN[id] ?? SOURCE_LABELS_EN[value];

  return `${prefix}${translated ?? fallbackTopicLabel(id, value)}`;
}
