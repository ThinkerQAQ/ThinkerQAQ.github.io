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
  "Golang",
  "Computer_Network",
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
  Golang: "Go",
  Computer_Network: "计算机网络",
};
export const CATEGORY_SLUGS = {
  "System_Design/分布式系统": "distributed-systems",
  System_Design: "system-design",
  "Database/MySQL": "mysql-database",
  Redis: "redis-cache",
  "Search_Server/Elasticsearch": "elasticsearch-search",
  "Message_Queue/Kafka": "kafka-message-queue",
  Zookeeper: "zookeeper",
  Golang: "go",
  Computer_Network: "computer-network",
};
export const ROOT_TOPIC_LABELS = {
  "System_Design/分布式系统": "基础与专题",
  System_Design: "方法论",
  "Database/MySQL": "基础与专题",
  Redis: "基础与专题",
  "Search_Server/Elasticsearch": "基础与专题",
  "Message_Queue/Kafka": "基础与专题",
  Zookeeper: "基础与专题",
  Golang: "Language",
  Computer_Network: "基础",
};

const GO_NOTE_TOPICS = [
  {
    id: "language",
    label: "Language",
    number: 1,
    notes: [
      "array.md",
      "slice.md",
      "map.md",
      "string.md",
      "function.md",
      "interface.md",
      "类型系统.md",
      "reflection.md",
      "defer.md",
      "error.md",
      "panic和recover.md",
      "make vs new.md",
      "unsafe.md",
    ],
  },
  {
    id: "concurrency",
    label: "Concurrency",
    number: 2,
    notes: [
      "channel.md",
      "concurrent.md",
      "context.md",
      "goroutine.md",
      "select.md",
      "sync.md",
      "sync.Mutex.md",
      "sync.RWMutex.md",
      "sync.Cond.md",
      "sync.Once.md",
      "sync.WaitGroup.md",
      "sync.map.md",
      "sync.pool.md",
      "atomic.md",
      "协程池.md",
    ],
  },
  {
    id: "runtime",
    label: "Runtime",
    number: 3,
    notes: [
      "GMP.md",
      "GC.md",
      "Golang堆管理.md",
      "Golang栈管理.md",
      "内存管理.md",
      "内存对齐.md",
      "逃逸分析.md",
      "Go构建过程.md",
      "plan9汇编.md",
    ],
  },
  {
    id: "performance",
    label: "Performance",
    number: 4,
    notes: [
      "Golang内存泄露.md",
      "benchmark.md",
      "pprof.md",
      "trace.md",
      "unittest.md",
    ],
  },
];

const goTopicEntries = GO_NOTE_TOPICS.flatMap((topic) =>
  topic.notes.map((note) => [
    note,
    { id: topic.id, label: topic.label, number: topic.number },
  ]),
);

const COMPUTER_NETWORK_NOTE_TOPICS = [
  {
    id: "transport",
    label: "传输层",
    number: 1,
    notes: [
      "传输层/TCP/TCP.md",
      "传输层/TCP/TCP三次握手.md",
      "传输层/TCP/TCP四次挥手.md",
      "传输层/TCP/TCP close wait.md",
      "传输层/TCP/TCP KeepAlive.md",
      "传输层/TCP/TCP流量控制.md",
      "传输层/TCP/TCP拥塞控制.md",
    ],
  },
  {
    id: "http",
    label: "HTTP 与 WebSocket",
    number: 2,
    notes: [
      "应用层/HTTP/HTTP版本.md",
      "应用层/HTTP/HTTP状态码.md",
      "应用层/HTTP/WebSocket.md",
    ],
  },
  {
    id: "network-services",
    label: "网络服务",
    number: 3,
    notes: [
      "应用层/DNS/DNS.md",
      "应用层/CDN/CDN.md",
    ],
  },
];

const computerNetworkTopicEntries = COMPUTER_NETWORK_NOTE_TOPICS.flatMap((topic) =>
  topic.notes.map((note) => [
    note,
    { id: topic.id, label: topic.label, number: topic.number },
  ]),
);

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
  Golang: new Set(goTopicEntries.map(([note]) => `Golang/${note}`)),
  Computer_Network: new Set(
    computerNetworkTopicEntries.map(([note]) => `Computer_Network/${note}`),
  ),
};

// Optional public taxonomy overrides. They change only the blog topic grouping;
// the original VNote paths stay untouched. Keys are paths relative to the notebook root.
export const NOTE_TOPIC_OVERRIDES = {
  Golang: new Map(goTopicEntries),
  Computer_Network: new Map(computerNetworkTopicEntries),
};

export const NEVER_PUBLISH = new Set(["Others", "Interview", "公司", "_v_recycle_bin", ".obsidian"]);
export const EXCLUDED_NOTE_PATHS = new Set([
  "Java/JUC/14.ThreadPool/线程池数目估算.md",
  "Java/JUC/例子/多线程统计文件夹大小.md",
  "Redis/attachments/20200922234136161_12958/集群.md",
]);
