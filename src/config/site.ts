export const SITE = {
  title: "ThinkerQAQ",
  description:
    "ThinkerQAQ 的个人网站。",
  author: "ThinkerQAQ",
  url: "https://thinkerqaq.github.io",
  repository: "https://github.com/ThinkerQAQ/ThinkerQAQ.github.io",
  locale: "zh-CN",
} as const;

export const NAV_ITEMS = [
  { href: "/articles/", label: "文章" },
  { href: "/projects/", label: "项目" },
  { href: "/series/", label: "系列" },
  { href: "/notes/", label: "笔记" },
  { href: "/about/", label: "关于" },
] as const;
