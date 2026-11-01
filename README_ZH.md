# ThinkerQAQ 网站 · Inkerio 实际生产案例

[English](README.md) · [线上网站](https://thinkerqaq.com/) · [Inkerio](https://github.com/ThinkerQAQ/inkerio) · [创建自己的博客](https://github.com/ThinkerQAQ/inkerio-content-template)

这是 [thinkerqaq.com](https://thinkerqaq.com/) 的**实际生产部署仓库**，适合参考 Inkerio 的真实运行与部署方式，但**不是新用户建站模板**。Inkerio 引擎、个人文章和内容分发工具由其他仓库分别维护；本仓库只拥有网站配置、部署流程和站点专属 Worker。

## 1. Quick Start：如何创建自己的博客

第一次使用 Inkerio，建议打开 [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template)，点击 **Use this template** 创建 `YOUR_USERNAME.github.io` 仓库。修改 `site.config.json` 中的五个配置字段，替换示例文章与图片，使用模板自带的 GitHub Actions 部署网站。

完整操作请参考 [Inkerio README](https://github.com/ThinkerQAQ/inkerio)，从创建 GitHub 仓库到访问线上博客均有对应步骤。

**普通用户不应该直接 Fork 本仓库。** 这里的私有内容仓库、Worker、搜索通知和多平台部署都是站点专属配置，不是 Inkerio 的运行前提。

## 2. 仓库职责

| 仓库 | 职责 |
| --- | --- |
| [Inkerio](https://github.com/ThinkerQAQ/inkerio) | Astro 渲染、双语页面、文章与笔记、RSS、站点地图和全文搜索 |
| `ThinkerQAQ/blog-content`（私有） | 个人文章、项目、摄影、About 和真实版权声明 |
| [SyndiRelay](https://github.com/ThinkerQAQ/syndirelay)（公开源码） | 独立的内容分发、Bridge、MCP、浏览器扩展及可选搜索通知 |
| **本仓库** | `site.config.json`、公开资源、构建覆盖层、GitHub Pages、EdgeOne 和生产 Worker |

## 3. 生产部署链路

`.github/workflows/deploy.yml` 检出**固定提交 SHA** 的 Inkerio 和 SyndiRelay，并通过独立只读 Deploy Key 检出私有内容仓库。`scripts/prepare-inkerio-deployment.mjs` 将本站配置和公开资源覆盖到引擎工作区，再生成一份静态网站产物，部署到 GitHub Pages 和 EdgeOne。

首页栏目、笔记分类与翻译、RSS 筛选、历史链接跳转等规则由本仓库的 `site.config.json` 管理。`scripts/verify-site-features.mjs` 在部署前核对 Canonical、站点地图、RSS 和旧地址，避免引擎升级导致兼容性问题。搜索引擎通知和 AI Search 同步由站点 CI 运行，不要求其他 Inkerio 用户安装 SyndiRelay。

**隐私与安全边界：** 私有文章和云服务密钥不能提交到本仓库；构建工作流从 GitHub Actions Secrets 获取凭据，不能把私有数据库、密钥或部署配置泄露到公开静态产物中。

## 4. Worker、统计与点赞

- `public/u.js` 从本站同域加载，但浏览器统计 POST 仍然发送到配置的 Worker 地址。**脚本同域不等于采集接口同域**；当前静态站点没有 `/api/send` 的同域反向代理，不能直接把采集地址改成博客域名。
- `workers/blog-ai` 负责可选 AI Search / Ask Blog 和统计相关服务，Worker/KV 资源由本站单独维护。
- `workers/blog-reactions` 负责点赞 HTTP 接口及 D1 数据，密钥与数据库不属于 Inkerio。
- Inkerio 只提供可选的 Umami、HTTP 点赞等客户端协议。没有配置时可以关闭。通用后端示例放在 Inkerio 的 `examples/cloudflare/`，第三方用户可用自己的资源部署。

生产 Worker 域名、D1/KV、采集端点和 DNS 的变更需要独立测试和授权，**不能把静态博客构建成功当成 Worker 迁移成功**。

## 5. 维护与版权

修改后需要通过网站配置注入测试及 GitHub Actions 验证。禁止将私有文章、服务密钥、Cookie 或本地数据库提交到本仓库。本仓库也不作为软件下载渠道，不再保留历史 BlogCTL/Inkerio Release 标签。

[MIT 许可证](LICENSE) · [第三方许可说明](THIRD_PARTY_NOTICES.md)
