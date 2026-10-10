# 搜索、统计与外部服务

Astro 输出静态页面。页面搜索、搜索引擎提交和浏览器交互分别由不同组件负责。

```text
Markdown → Astro → 静态页面
                   ├── Pagefind：站内搜索
                   ├── Sitemap / RSS / SEO
                   └── 浏览器
                        ├── Umami：访问统计
                        ├── utterances：评论
                        └── Reactions Worker：文章反馈

BlogCTL → IndexNow / Google Search Console 等搜索引擎
BlogCTL → AI Search 内容同步（独立流程）
```

## 各组件的用途

- **Pagefind**：构建完成后索引静态 HTML，页面入口在 [`src/pages/search.astro`](../../../src/pages/search.astro)。
- **搜索引擎**：站点生成 Sitemap、Canonical 等元信息；主动提交通过 BlogCTL 的 [Search CLI](../../../tools/blogctl/cmd/search.go) 完成。
- **Umami**：只有配置了网站 ID 和代理源地址时，[`BaseLayout.astro`](../../../src/layouts/BaseLayout.astro) 才会注入统计脚本。用户可以通过站内统计控制页关闭本浏览器的追踪。
- **评论与反馈**：分别由 [utterances](../../../src/components/ContentComments.astro) 和 [Reactions](../../../src/components/ContentReaction.astro) 组件负责。
- **AI Search**：是单独的索引同步与 Worker 流程。后台部署存在不代表前台 Ask Blog 功能已经开放。

Worker 位于 `workers/`。EdgeOne Makers 当前部署静态站点，不附带旧的代理 Edge Function。

如果出现访问统计异常，按[统计排查指南](../how-to/diagnose-analytics.md)逐层检查请求；配置入口见[集成参考](../reference/integrations.md)。
