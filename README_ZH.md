# ThinkerQAQ 网站部署仓库

[English](README.md) · [线上网站](https://thinkerqaq.com/) · [Inkerio 引擎](https://github.com/ThinkerQAQ/inkerio)

本仓库**仅负责 ThinkerQAQ 个人网站的配置与生产部署**，不再重复维护通用博客引擎、文章原文或分发工具。

| 仓库 | 职责 |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Astro 页面、中英文展示、静态构建、RSS、站点地图和搜索 |
| `ThinkerQAQ/blog-content`（私有） | 文章、项目、摄影、站点内容及版权文案 |
| `ThinkerQAQ/syndirelay`（私有） | 多平台分发、远端草稿、Bridge、MCP、浏览器扩展及搜索 CI 组件 |
| **本仓库** | 网站身份配置 `site.config.json`、公开验证资源 `public/`、专属 Worker `workers/`、GitHub Pages 和 EdgeOne 部署 |

## 发布与仓库职责

**本仓库只负责网站部署，不提供软件下载和历史安装包。**
原有 BlogCTL/旧 Inkerio 的站点 Release 和 Git Tags 已清理；
新的引擎源码版本在 [Inkerio Releases](https://github.com/ThinkerQAQ/inkerio/releases)
独立发布。SyndiRelay 已[公开源码](https://github.com/ThinkerQAQ/syndirelay)，
但可执行程序和浏览器扩展尚无经完整验收的正式 Release。
不要将旧 BlogCTL 安装包视作新版 SyndiRelay。

## 站点 Worker、统计与迁移边界

**`public/u.js`、`workers/blog-ai` 和 `workers/blog-reactions` 均属于本站的生产部署**，不是遗漏在旧仓库中的通用引擎源码。Inkerio 只负责可配置的统计、点赞和 AI 问答客户端，缺失配置时默认不启用。`/u.js` 在站点同域加载，但统计上报目前仍走 `workers.dev`；尚未实现 `/api/send` 的同域反向代理，不能贸然把采集 URL 改为静态站点域名。详见[集成边界与大陆采集说明](docs/worker-integration-boundaries.md)。

## 生产部署

`.github/workflows/deploy.yml` 以固定提交 SHA 检出公开的 Inkerio 和 SyndiRelay，并使用独立只读 Deploy Key 检出私有内容，通过 `scripts/prepare-inkerio-deployment.mjs` 注入本站配置与资源，构建统一静态产物并部署至 GitHub Pages 和 EdgeOne Makers。SyndiRelay 仅在 GitHub Actions 临时环境中用于 Cloudflare AI Search 同步与搜索引擎通知；`scripts/prepare-search-notify.mjs` 生成临时且与站点域名绑定的搜索配置。私有内容、凭据和本地用户数据不会进入静态网站产物。

本网站的首页知识栏目、笔记分类及英译、RSS 筛选规则和旧链接跳转，均由 **`site.config.json`** 持有。构建后执行 `scripts/verify-site-features.mjs`，自动核对首页、RSS、Canonical 和 Sitemap，避免升级通用引擎时丢失历史地址。配置方式见[Inkerio 站点配置参考](https://github.com/ThinkerQAQ/inkerio/blob/main/docs/zh-CN/reference/site-features.md)。

引擎运行、定制与内容管理请参阅：

- [Inkerio 文档](https://github.com/ThinkerQAQ/inkerio/tree/main/docs)
- [公开内容模板](https://github.com/ThinkerQAQ/inkerio-content-template)

**禁止将私有文章、服务密钥或本地数据提交到本仓库。** 生产凭据由 GitHub Actions Secrets 管理。更新固定的引擎或搜索组件版本时，先通过 CI、配置注入测试和公开内容模板构建验证。

Cloudflare AI Worker 和点赞 Worker 属于本站生产集成，不属于 Inkerio 通用引擎。

[MIT 许可证](LICENSE) · [第三方许可说明](THIRD_PARTY_NOTICES.md)

**可插拔统计与点赞：** `site.config.json` 现在明确选择 Umami 统计与 HTTP 点赞适配器，真实采集地址、公开站点 ID 与点赞地址仍由原有 GitHub Actions 变量提供。Inkerio 的[通用协议和自部署示例](https://github.com/ThinkerQAQ/inkerio/blob/main/docs/zh-CN/reference/integrations.md)支持不使用 Cloudflare 的后端。**不会迁移或覆盖**本站生产 Worker、D1/KV 数据和现有域名。

## Inkerio 实际生产案例（Live Example）

本仓库是 [thinkerqaq.com](https://thinkerqaq.com/) 的**实际生产部署代码**，包含固定版本的 Inkerio 引擎、站点专属 Worker 与独立的部署配置。可以参考其分仓、构建与集成方式，但**新用户不应该直接复制本仓库作为建站模板**。如果只是想创建 `username.github.io` 博客，请从 [Inkerio](https://github.com/ThinkerQAQ/inkerio) 入门，再通过 [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template) 的 **Use this template** 创建单仓库站点。
