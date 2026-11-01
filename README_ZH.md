# ThinkerQAQ 网站部署仓库

[English](README.md) · [线上网站](https://thinkerqaq.com/) · [Inkerio 引擎](https://github.com/ThinkerQAQ/inkerio)

本仓库**仅负责 ThinkerQAQ 个人网站的配置与生产部署**，不再重复维护通用博客引擎、文章原文或分发工具。

| 仓库 | 职责 |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Astro 页面、中英文展示、静态构建、RSS、站点地图和搜索 |
| `ThinkerQAQ/blog-content`（私有） | 文章、项目、摄影、站点内容及版权文案 |
| `ThinkerQAQ/syndirelay`（私有） | 多平台分发、远端草稿、Bridge、MCP、浏览器扩展及搜索 CI 组件 |
| **本仓库** | 网站身份配置 `site.config.json`、公开验证资源 `public/`、专属 Worker `workers/`、GitHub Pages 和 EdgeOne 部署 |

## 生产部署

`.github/workflows/deploy.yml` 使用不同的只读 Deploy Key 检出**固定提交版本**的 Inkerio、私有 SyndiRelay 和私有内容，通过 `scripts/prepare-inkerio-deployment.mjs` 注入本站配置与资源，构建统一静态产物并部署至 GitHub Pages 和 EdgeOne Makers。SyndiRelay 仅在 GitHub Actions 临时环境中用于 Cloudflare AI Search 同步与搜索引擎通知；`scripts/prepare-search-notify.mjs` 生成临时且与站点域名绑定的搜索配置。私有源码、凭据和本地数据不会进入静态网站产物。

引擎运行、定制与内容管理请参阅：

- [Inkerio 文档](https://github.com/ThinkerQAQ/inkerio/tree/main/docs)
- [公开内容模板](https://github.com/ThinkerQAQ/inkerio-content-template)

**禁止将私有文章、服务密钥或本地数据提交到本仓库。** 生产凭据由 GitHub Actions Secrets 管理。更新固定的引擎或搜索组件版本时，先通过 CI、配置注入测试和公开内容模板构建验证。

Cloudflare AI Worker 和点赞 Worker 属于本站生产集成，不属于 Inkerio 通用引擎。

[MIT 许可证](LICENSE) · [第三方许可说明](THIRD_PARTY_NOTICES.md)
