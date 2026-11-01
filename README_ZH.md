# ThinkerQAQ 网站部署仓库

[English](README.md) · [线上网站](https://thinkerqaq.com/) · [Inkerio 引擎](https://github.com/ThinkerQAQ/inkerio)

本仓库**仅负责 ThinkerQAQ 个人网站的配置和生产部署**，不再维护通用博客引擎，也不存储文章原文。

| 仓库 | 职责 |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Astro 页面、中英文展示、静态构建、RSS、站点地图和搜索 |
| `ThinkerQAQ/blog-content`（私有） | 文章、项目、摄影、站点内容及版权文案 |
| `ThinkerQAQ/syndirelay`（私有） | 多平台分发、远端草稿、Bridge、MCP 和浏览器扩展 |
| **本仓库** | 网站身份配置 `site.config.json`、站点静态验证资源 `public/`、专属 Worker `workers/`、GitHub Pages 和 EdgeOne 部署 |

## 生产部署

`.github/workflows/deploy.yml` 检出**固定提交版本的 Inkerio**，通过 `scripts/prepare-inkerio-deployment.mjs` 注入本站配置与公开资源，使用只读 Deploy Key 拉取私有内容，构建唯一的静态产物，并将同一产物部署至 GitHub Pages 和 EdgeOne Makers。工作流还会准备 AI Search 数据并执行搜索引擎通知。

引擎运行、定制与内容管理请参阅：

- [Inkerio 文档](https://github.com/ThinkerQAQ/inkerio/tree/main/docs)
- [公开内容模板](https://github.com/ThinkerQAQ/inkerio-content-template)

**禁止将私有文章、服务密钥或本地数据提交到本仓库。** 生产凭据由 GitHub Actions Secrets 管理。升级固定的引擎版本时，先用公开内容模板完成构建验证。

## 尚待解除的过渡依赖

`tools/blogctl/` 暂时保留，**仅供部署工作流执行 AI Search 输入准备、同步和搜索引擎通知**，不再在本仓库维护分发工具或发布 Release。要删除此目录，需要先为 CI 提供经过验证的独立实现；目前 SyndiRelay 是私有仓库，公开站点工作流不能直接依赖它而不增加额外授权配置。

Cloudflare AI Worker 和点赞 Worker 属于本网站的生产集成，不属于通用 Inkerio 引擎。

[MIT 许可证](LICENSE) · [第三方许可说明](THIRD_PARTY_NOTICES.md)
