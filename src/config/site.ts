export const SITE = {
  title: "ThinkerQAQ",
  homeTitle: "ThinkerQAQ | 后端工程、并发编程与分布式系统",
  description:
    "ThinkerQAQ 的个人技术博客，记录后端工程、Go、Java、并发编程、分布式系统、数据系统与软件工程实践。",
  author: "ThinkerQAQ",
  url: "https://thinkerqaq.github.io",
  repository: "https://github.com/ThinkerQAQ/ThinkerQAQ.github.io",
  locale: "zh-CN",
} as const;

export const ARTICLE_PAGE_SIZE = 10;
export const NOTE_PAGE_SIZE = 10;

export const COMMENTS = {
  provider: "utterances",
  repository: "ThinkerQAQ/ThinkerQAQ.github.io",
  issueTerm: "pathname",
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
