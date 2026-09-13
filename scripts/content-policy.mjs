// Import only explicitly reviewed source subtrees. Never widen this to the VNote root.
export const IMPORT_ENABLED = true;
export const PUBLIC_NOTEBOOKS = [
  "Java",
  "System_Design/分布式系统",
  "System_Design",
  "Database/MySQL",
  "Redis",
  "Search_Server/Elasticsearch",
  "Message_Queue/Kafka",
  "Zookeeper",
  "Golang",
  "Computer_Network",
  "Container",
  "Algorithm",
  "Operating_System",
  "Virtual_Machine",
  "Software_Engineering",
];
export const PROMOTED_ARTICLES = [];
export const FEATURED_PATHS = new Set();
export const CATEGORY_LABELS = {
  Java: "Java",
  "System_Design/分布式系统": "分布式系统",
  System_Design: "系统设计",
  "Database/MySQL": "MySQL / Database",
  Redis: "Redis / Cache",
  "Search_Server/Elasticsearch": "Elasticsearch / Search",
  "Message_Queue/Kafka": "Kafka / Message Queue",
  Zookeeper: "ZooKeeper",
  Golang: "Go",
  Computer_Network: "计算机网络",
  Container: "Docker / Kubernetes",
  Algorithm: "Data Structures & Algorithms",
  Operating_System: "Operating System / Linux",
  Virtual_Machine: "Garbage Collection / Runtime",
  Software_Engineering: "Software Architecture & Engineering",
};
export const CATEGORY_SLUGS = {
  Java: "java",
  "System_Design/分布式系统": "distributed-systems",
  System_Design: "system-design",
  "Database/MySQL": "mysql-database",
  Redis: "redis-cache",
  "Search_Server/Elasticsearch": "elasticsearch-search",
  "Message_Queue/Kafka": "kafka-message-queue",
  Zookeeper: "zookeeper",
  Golang: "go",
  Computer_Network: "computer-network",
  Container: "container",
  Algorithm: "algorithm",
  Operating_System: "operating-system",
  Virtual_Machine: "garbage-collection",
  Software_Engineering: "software-engineering",
};

// Import IDs replaced by a broader public notebook. During a selective sync,
// their generated content and manifest entries are removed before the new
// notebook is written, preventing duplicate categories after a taxonomy change.
export const LEGACY_IMPORT_IDS = {
  java: ["java-juc"],
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
  Container: "基础",
  Algorithm: "Overview",
  Operating_System: "Overview",
  Virtual_Machine: "Fundamentals",
  Software_Engineering: "Architecture",
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

const ALGORITHM_NOTE_TOPICS = [
  {
    id: "overview",
    label: "Overview",
    number: 1,
    notes: ["数据结构与算法.md"],
  },
  {
    id: "data-structures",
    label: "Data Structures",
    number: 2,
    notes: [
      "数据结构/array.md",
      "数据结构/hashmap.md",
      "数据结构/linkedlist.md",
      "数据结构/queue.md",
      "数据结构/set.md",
      "数据结构/stack.md",
      "数据结构/tree.md",
      "数据结构/红黑树.md",
      "数据结构/跳表.md",
      "数据结构/heap.md",
      "数据结构/BitMap.md",
      "数据结构/BloomFilter.md",
      "数据结构/graph.md",
      "数据结构/UnionFind.md",
      "数据结构/LSM.md",
      "数据结构/ziplist.md",
      "数据结构/B Tree.md",
      "数据结构/稀疏索引.md",
      "数据结构/索引.md",
      "数据结构/倒排索引.md",
    ],
  },
  {
    id: "algorithms",
    label: "Algorithms",
    number: 3,
    notes: [
      "算法/缓存替换策略.md",
      "算法/动态规划.md",
      "算法/贪心.md",
      "算法/分治.md",
      "算法/递归.md",
      "算法/回溯.md",
      "算法/DFS.md",
      "算法/排序/排序.md",
      "算法/排序/冒泡排序.md",
      "算法/排序/堆排序.md",
      "算法/排序/归并排序.md",
      "算法/排序/插入排序.md",
      "算法/排序/快速排序.md",
      "算法/排序/选择排序.md",
      "算法/查找/二分查找.md",
      "算法/查找/线性查找.md",
    ],
  },
];

const algorithmTopicEntries = ALGORITHM_NOTE_TOPICS.flatMap((topic) =>
  topic.notes.map((note) => [
    note,
    { id: topic.id, label: topic.label, number: topic.number },
  ]),
);


const OPERATING_SYSTEM_NOTE_TOPICS = [
  {
    id: "overview",
    label: "Overview",
    number: 1,
    notes: ["操作系统.md", "Linux/Linux.md"],
  },
  {
    id: "processes-concurrency",
    label: "Processes & Concurrency",
    number: 2,
    notes: [
      "进程管理/进程管理.md",
      "进程管理/程序、进程、线程.md",
      "进程管理/IPC.md",
      "进程管理/同步.md",
      "进程管理/死锁.md",
      "Linux/进程/进程.md",
      "Linux/进程/线程.md",
    ],
  },
  {
    id: "memory",
    label: "Memory",
    number: 3,
    notes: [
      "存储管理/存储管理.md",
      "存储管理/内存分配和回收.md",
      "存储管理/段页式存储.md",
      "存储管理/虚拟内存.md",
      "存储管理/页面置换.md",
      "存储管理/Linux的内存管理.md",
      "Linux/内存/内存管理.md",
    ],
  },
  {
    id: "io-syscalls",
    label: "I/O & Syscalls",
    number: 4,
    notes: [
      "Linux/系统调用/系统调用.md",
      "Linux/IO/IO.md",
      "Linux/IO/IO模型.md",
      "Linux/IO/select、poll、epoll.md",
      "Linux/IO/零拷贝机制.md",
    ],
  },
  {
    id: "performance-diagnostics",
    label: "Performance & Diagnostics",
    number: 5,
    notes: [
      "Linux/性能调优/Linux性能调优.md",
      "Linux/性能调优/CPU调优.md",
      "Linux/性能调优/内存调优.md",
      "Linux/性能调优/磁盘调优.md",
      "Linux/性能调优/网络调优.md",
      "Linux/性能调优/火焰图.md",
      "Linux/命令/Linux常用命令.md",
      "Linux/命令/top.md",
      "Linux/命令/vmstat.md",
      "Linux/命令/iostat.md",
      "Linux/命令/pidstat.md",
      "Linux/命令/sar.md",
      "Linux/命令/strace.md",
      "Linux/命令/tcpdump.md",
      "Linux/命令/ulimit.md",
    ],
  },
  {
    id: "isolation-containers",
    label: "Isolation & Containers",
    number: 6,
    notes: [
      "Linux/虚拟化/Linux Namespace.md",
      "Linux/虚拟化/Linux cgroup.md",
      "Linux/命令/chroot.md",
    ],
  },
];

const operatingSystemTopicEntries = OPERATING_SYSTEM_NOTE_TOPICS.flatMap((topic) =>
  topic.notes.map((note) => [
    note,
    { id: topic.id, label: topic.label, number: topic.number },
  ]),
);


const VIRTUAL_MACHINE_NOTE_TOPICS = [
  { id: "fundamentals", label: "Fundamentals", number: 1, notes: ["GC.md", "STW.md", "内存泄露.md"] },
  { id: "tuning", label: "Tuning", number: 2, notes: ["GC调优.md"] },
];
const virtualMachineTopicEntries = VIRTUAL_MACHINE_NOTE_TOPICS.flatMap((topic) =>
  topic.notes.map((note) => [note, { id: topic.id, label: topic.label, number: topic.number }]),
);


const SOFTWARE_ENGINEERING_NOTE_TOPICS = [
  { id: "architecture", label: "Architecture", number: 1, notes: [
    "Architecture/架构.md", "Architecture/架构模式/架构模式.md",
    "Architecture/架构模式/单体架构.md", "Architecture/架构模式/分层架构.md",
    "Architecture/架构模式/事件驱动架构.md", "Architecture/架构模式/读写分离架构.md",
    "Architecture/架构模式/DDD/DDD.md", "Architecture/架构模式/微服务/微服务.md",
  ] },
  { id: "platform-services", label: "Microservices & Platform", number: 2, notes: [
    "Architecture/架构模式/微服务/JWT.md", "Architecture/架构模式/微服务/OAuth.md",
    "Architecture/架构模式/微服务/OpenId Connect.md", "Architecture/架构模式/微服务/如何设计API网关.md",
    "Architecture/架构模式/微服务/如何设计metrics监控.md", "Architecture/架构模式/微服务/如何设计容错组件.md",
    "Architecture/架构模式/微服务/如何设计日志监控.md", "Architecture/架构模式/微服务/如何设计注册中心.md",
    "Architecture/架构模式/微服务/如何设计监控系统.md", "Architecture/架构模式/微服务/如何设计认证授权.md",
    "Architecture/架构模式/微服务/如何设计负载均衡组件.md", "Architecture/架构模式/微服务/如何设计配置中心.md",
    "Architecture/架构模式/微服务/如何设计链路追踪.md",
  ] },
  { id: "modeling", label: "Modeling", number: 3, notes: [
    "建模/ER图.md", "建模/UML.md", "建模/时序图.md", "建模/架构图.md", "建模/流程图.md",
    "建模/状态图.md", "建模/类图.md", "建模/组件图.md", "建模/部署图.md",
  ] },
  { id: "programming-patterns", label: "Programming Patterns", number: 4, notes: [
    "编程范式/Concurrent/事件溯源模式.md", "编程范式/Concurrent/发布订阅模式.md",
    "编程范式/Concurrent/生产者消费者模式.md", "编程范式/Functional/函数式选项模式.md",
    "编程范式/Functional/接口型函数.md",
  ] },
  { id: "design-principles", label: "Design Principles", number: 5, notes: [
    "编程范式/OOP/OOP设计原则/OOP设计原则.md", "编程范式/OOP/OOP设计原则/依赖倒置原则.md",
    "编程范式/OOP/OOP设计原则/单一职责原则.md", "编程范式/OOP/OOP设计原则/合成复用原则.md",
    "编程范式/OOP/OOP设计原则/开闭原则.md", "编程范式/OOP/OOP设计原则/接口隔离原则.md",
    "编程范式/OOP/OOP设计原则/迪米特法则.md", "编程范式/OOP/OOP设计原则/里氏替换原则.md",
  ] },
  { id: "design-patterns", label: "Design Patterns", number: 6, notes: [
    "编程范式/OOP/OOP设计模式/OOP设计模式.md", "编程范式/OOP/OOP设计模式/创建型模式/单例模式.md",
    "编程范式/OOP/OOP设计模式/创建型模式/工厂方法.md", "编程范式/OOP/OOP设计模式/创建型模式/构建者模式.md",
    "编程范式/OOP/OOP设计模式/结构型模式/代理模式.md", "编程范式/OOP/OOP设计模式/结构型模式/装饰器模式.md",
    "编程范式/OOP/OOP设计模式/结构型模式/适配器模式.md", "编程范式/OOP/OOP设计模式/行为型模式/模板方法.md",
    "编程范式/OOP/OOP设计模式/行为型模式/状态模式.md", "编程范式/OOP/OOP设计模式/行为型模式/策略模式.md",
    "编程范式/OOP/OOP设计模式/行为型模式/观察者模式.md", "编程范式/OOP/OOP设计模式/行为型模式/责任链.md",
  ] },
];
const softwareEngineeringTopicEntries = SOFTWARE_ENGINEERING_NOTE_TOPICS.flatMap((topic) =>
  topic.notes.map((note) => [note, { id: topic.id, label: topic.label, number: topic.number }]),
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
  Container: new Set([
    "Container/Docker/Docker.md",
    "Container/Kubernetes/Kubernetes.md",
  ]),
  Algorithm: new Set(algorithmTopicEntries.map(([note]) => `Algorithm/${note}`)),
  Operating_System: new Set(
    operatingSystemTopicEntries.map(([note]) => `Operating_System/${note}`),
  ),
  Virtual_Machine: new Set(virtualMachineTopicEntries.map(([note]) => `Virtual_Machine/${note}`)),
  Software_Engineering: new Set(softwareEngineeringTopicEntries.map(([note]) => `Software_Engineering/${note}`)),
};

// Optional public taxonomy overrides. They change only the blog topic grouping;
// the original VNote paths stay untouched. Keys are paths relative to the notebook root.
export const NOTE_TOPIC_OVERRIDES = {
  Golang: new Map(goTopicEntries),
  Computer_Network: new Map(computerNetworkTopicEntries),
  Algorithm: new Map(algorithmTopicEntries),
  Operating_System: new Map(operatingSystemTopicEntries),
  Virtual_Machine: new Map(virtualMachineTopicEntries),
  Software_Engineering: new Map(softwareEngineeringTopicEntries),
};

// These reviewed notes contain documentation-only credentials. Keep the source
// VNote untouched and replace those examples with explicit placeholders while importing.
export const REVIEWED_EXAMPLE_CREDENTIAL_PATHS = new Set([
  "Database/MySQL/canal/canal.md",
]);

export const NEVER_PUBLISH = new Set(["Others", "Interview", "公司", "_v_recycle_bin", ".obsidian"]);
export const EXCLUDED_NOTE_PATHS = new Set([
  "Java/JUC/14.ThreadPool/线程池数目估算.md",
  "Java/JUC/例子/多线程统计文件夹大小.md",
  "Redis/attachments/20200922234136161_12958/集群.md",
]);