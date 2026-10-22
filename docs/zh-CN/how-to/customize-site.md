# 设置自己的站点

仓库当前保存的是作者个人站点的配置。本地运行示例不必先修改；正式发布自己的站点时，需要检查下列设置。目前没有一个环境变量可以统一替换全部站点身份。

## 名称、域名与联系方式

在**引擎仓库**中修改：

| 文件 | 需要修改的内容 |
| --- | --- |
| [`src/config/site.ts`](../../../src/config/site.ts) | `SITE.title`、`homeTitle`、`description`、`author`、`url`、`github`、`profiles`、`repository`、`contactEmail`、`alternateNames` |
| [`src/config/i18n.ts`](../../../src/config/i18n.ts) | 中英文 `homeTitle`、首页无障碍标签，以及 About、Search 等含作者身份的描述 |
| [`astro.config.mjs`](../../../astro.config.mjs) | `site`，与 `SITE.url` 使用同一个 HTTPS 站点源地址 |
| [`src/pages/about.astro`](../../../src/pages/about.astro)、[`src/pages/[locale]/about.astro`](../../../src/pages/[locale]/about.astro) | 个人简介、链接与站点说明 |
| [`public/`](../../../public/) | 自己的图标、域名及站长验证文件等站点资源 |

同时删除或替换 `SITE` 中的 `icpRecord`、`icpLookupUrl`、`publicSecurityRecord`、`publicSecurityLookupUrl`。它们对应作者的个人站点，应按自己站点的实际情况填写，不能直接沿用。

搜索引擎代码中的 `ThinkerQAQ` 和 `thinkerqaq.com`，逐项检查剩余引用：指向 Inkerio 上游源码的链接可以保留，标识自己网站的值需要替换。不要全局替换依赖名或 Go import 路径。

## 评论、统计与反馈

| 功能 | 配置位置 | 验证方式 |
| --- | --- | --- |
| utterances 评论 | `src/config/site.ts` 的 `COMMENTS.repository`、`label`、`theme`，以及自己 GitHub Issues 仓库的 utterances 安装 | 打开文章讨论区，确认链接指向自己的仓库 |
| Umami | `PUBLIC_UMAMI_WEBSITE_ID`、`PUBLIC_UMAMI_PROXY_ORIGIN` | 检查 `/u.js` 和上报请求，再看自己的 Dashboard |
| 有帮助/点赞 | `PUBLIC_REACTION_WORKER_URL` | 部署[自己的 Reactions Worker](../../../workers/blog-reactions/README.md)，检查计数 |
| AI 问答 | 可选 Worker 配置与前端挂载 | 参照 [Worker 说明](../../../workers/blog-ai/README.md)；仓库当前关闭聊天入口 |

评论组件挂载后会尝试加载 utterances，没有通用的 `enabled` 开关。不需要评论时，移除对应组件挂载；需要时配置自己的仓库。统计和反馈的构建变量留空可以关闭对应集成，Fork 时不要保留作者的站点 ID。

本地变量可通过终端或 Astro 本地环境文件设置，部署时在构建环境配置对应值。静态站点的构建变量变化后，需要重新构建。

## 根路径托管与部署

页面和媒体使用 `/articles/`、`/media/` 等站点根路径。建议部署到根域名、自定义域名或 `https://YOUR_USER.github.io/` 用户主页。若使用 `/REPOSITORY/` 下的项目 Pages 地址，需要另外检查根路径链接和 Astro `base`；只改 `site` 不能让整个站点支持子路径。

使用 BlogCTL 提交索引时，还要单独更新 `[search]`。它指定要提交的线上站点，不会修改网站的构建配置。详见 [BlogCTL 配置](../../../tools/blogctl/docs/zh-CN/reference/configuration.md)。

## 发布前检查

装配自己的内容，运行 `npm run check`、`npm run build` 和 `npm run preview`。检查首页标题、关于页、页脚、文章 canonical、语言切换、`rss.xml`、`sitemap-index.xml`、评论和统计，并在 `dist/` 中搜索旧域名，确认剩余网站链接符合预期。

## 站外分发域名

BlogCTL 目前使用 `tools/blogctl/compiler/markdown.go` 的 `SiteOrigin` 常量生成 canonical 和根路径链接。修改上述站点配置或索引 `[search]` 不会同步改变它。Fork 用于自己的站外分发前，需要调整并检查编译后的链接，同时配置自己的 R2 素材存储；作者公开素材地址不代表拥有上传权限。
