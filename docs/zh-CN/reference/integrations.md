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

部署环境变量参见[部署参考](deployment.md)。源码存在某个组件不代表线上功能已启用，需同时核对构建变量与运行时入口。
