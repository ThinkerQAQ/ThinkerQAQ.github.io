# 部署配置参考

CI 以 [`.github/workflows/`](../../../.github/workflows/) 中的定义为准。

| Workflow | 职责 |
| --- | --- |
| `validate.yml` | DevTool 验证、构建、打包 |
| `deploy.yml` | 读取引擎与内容、生成静态资源、部署到 GitHub Pages/EdgeOne |
| `content-watch.yml` | 检查内容仓库最新提交，必要时触发部署 |
| `blogctl-release.yml` | 打包并发布 BlogCTL |
| `worker-release.yml` | Blog AI Worker 部署 |
| `worker-reactions-release.yml` | 反应组件 Worker 部署 |

构建使用 Go 1.27.1、Node.js 22、Java 17，以及 Graphviz 和图表渲染所需字体与浏览器工具。

## 主要配置

| 变量 | 用途 |
| --- | --- |
| `BLOG_CONTENT_DEPLOY_KEY` | 读取私有内容仓库的部署密钥 |
| `CONTENT_REPOSITORY` | 内容仓库位置 |
| `EDGEONE_API_TOKEN` | EdgeOne Makers 部署凭据 |
| `PUBLIC_UMAMI_WEBSITE_ID`、`PUBLIC_UMAMI_PROXY_ORIGIN` | Umami 网站与脚本/事件源地址 |
| `PUBLIC_REACTION_WORKER_URL` | 文章反馈 API |
| `CLOUDFLARE_AI_SEARCH_*` | AI Search 同步所需配置 |
| `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`、`GOOGLE_SEARCH_CONSOLE_SITE_URL` | Google Search Console 提交 |

GitHub Pages 和 EdgeOne Makers 都使用静态构建产物；当前没有单独附加旧 Edge Function 代理。

成功的内容触发部署会上传 `deployed-content-state` Artifact，记录已部署的内容 SHA，保留 90 天。监控工作流据此判断内容是否变化；过期后会进行一次完整同步。

具体步骤见[部署指南](../how-to/deploy.md)。
