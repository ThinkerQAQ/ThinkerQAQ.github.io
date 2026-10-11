# 站点集成参考

| 功能 | 实现位置 | 相关配置 |
| --- | --- | --- |
| 页面与 SEO | [`src/pages/`](../../../src/pages/)、[`structured-data.ts`](../../../src/lib/structured-data.ts) | Astro 站点构建 |
| Pagefind | [构建脚本](../../../scripts/build-pagefind.mjs)、[搜索页面](../../../src/pages/search.astro) | Astro 构建完成后生成静态索引 |
| 搜索引擎提交 | [BlogCTL Search](../../../tools/blogctl/cmd/search.go)、[部署 Workflow](../../../.github/workflows/deploy.yml) | IndexNow、Google 等 |
| AI Search | [Worker 文档](../../../workers/blog-ai/README.md)、[BlogCTL 命令](../../../tools/blogctl/cmd/ai_search.go) | Cloudflare 同步环境变量 |
| Umami | [BaseLayout](../../../src/layouts/BaseLayout.astro)、[Analytics](../../../src/components/ContentAnalyticsRuntime.astro) | `PUBLIC_UMAMI_*` |
| 评论 | [ContentComments](../../../src/components/ContentComments.astro) | utterances |
| 文章反馈 | [ContentReaction](../../../src/components/ContentReaction.astro)、[Worker 文档](../../../workers/blog-reactions/README.md) | `PUBLIC_REACTION_WORKER_URL` |
| EdgeOne 静态部署 | [部署 Workflow](../../../.github/workflows/deploy.yml) | `EDGEONE_API_TOKEN` |
| 多平台分发 | [BlogCTL](../../../tools/blogctl/docs/zh-CN/index.md) | Bridge、发布平台 Adapter |

Umami 的浏览器脚本保存在 `public/u.js`，由本站静态提供 `/u.js`。来源：`https://cloud.umami.is/script.js`（2026-10-11 获取，SHA-256：`91a876d767646fd5b7701b6fabf97f8a99ae53b94e7e5b58d465bad1e5d763e0`）；许可证见 `public/u.js.LICENSE.txt`。`PUBLIC_UMAMI_PROXY_ORIGIN` 仍指向 `POST /api/send` 上报端点，脚本静态化不解决采集 API 的连通性。更新脚本后运行 `npm run test:umami`。

部署环境变量参见[部署参考](deployment.md)。源码存在某个组件不代表线上功能已启用，需同时核对构建变量与运行时入口。

RSS 分为中文 `/rss.xml` 与英文 `/en/rss.xml`，各自只包含对应语言的已发布文章。
