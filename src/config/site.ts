export const SITE = {
  title: "ThinkerQAQ",
  homeTitle: "ThinkerQAQ | 后端工程、并发编程与分布式系统",
  description:
    "ThinkerQAQ 的个人技术博客，记录后端工程、Go、Java、并发编程、分布式系统、数据系统与软件工程实践。",
  author: "ThinkerQAQ",
  icpRecord: "粤ICP备2026150158号-1",
  icpLookupUrl: "https://beian.miit.gov.cn/",
  publicSecurityRecord: "粤公网安备44140202000301号",
  publicSecurityLookupUrl: "https://beian.mps.gov.cn/#/query/webSearch?code=44140202000301",
  authorProfilePath: "/about/",
  alternateNames: ["Thinker QAQ"],
  url: "https://thinkerqaq.com",
  github: "https://github.com/ThinkerQAQ",
  profiles: ["https://github.com/ThinkerQAQ", "https://dev.to/thinkerqaq"],
  repository: "https://github.com/ThinkerQAQ/ThinkerQAQ.github.io",
  contact: "https://github.com/ThinkerQAQ",
  locale: "zh-CN",
} as const;

export const ARTICLE_PAGE_SIZE = 10;
export const NOTE_PAGE_SIZE = 10;

export const COMMENTS = {
  provider: "utterances",
  repository: "ThinkerQAQ/ThinkerQAQ.github.io",
  label: "blog-comment",
  theme: "preferred-color-scheme",
} as const;

export const NAV_ITEMS = [
  { href: "/articles/", label: "文章" },
  { href: "/projects/", label: "项目" },
  { href: "/series/", label: "系列" },
  { href: "/notes/", label: "笔记" },
  { href: "/about/", label: "关于" },
] as const;
