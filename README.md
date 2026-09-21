# ThinkerQAQ Blog

[English](./README_EN.md)

在线博客：<https://thinkerqaq.github.io/>

## 简介

这是一个基于 [Astro](https://astro.build/) 的中英双语个人技术博客与数字花园。

博客拆成两个部分：

```text
blog-content
Articles / Notes / Series / Projects / Media
        │
        ▼
ThinkerQAQ.github.io
Astro / Search / SEO / BlogCTL / CI
        │
        ▼
GitHub Pages
```

当前仓库负责网站引擎；真实内容保存在独立的 Content Repository 中，在构建时注入。

主要能力：

- Articles / Notes / Series / Projects
- 中文站点与 `/en/` 英文站点
- Pagefind 全文搜索
- Cloudflare AI Search / Workers
- utterances 评论
- Umami 访问统计
- canonical、Open Graph、JSON-LD、`hreflang`、RSS、sitemap、IndexNow
- BlogCTL 与多平台文章分发
- GitHub Actions + GitHub Pages 自动构建与发布

## Tutorial

### 1. Clone

如果只是想看 Public Engine：

```bash
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
```

如果想带一套完整示例内容一起运行：

```bash
mkdir thinkerqaq-blog
cd thinkerqaq-blog

git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
git clone https://github.com/ThinkerQAQ/blog-content-template.git blog-content
```

目录保持为：

```text
thinkerqaq-blog/
├── ThinkerQAQ.github.io/
└── blog-content/
```

`blog-content-template` 只是一套示例内容，不参与当前博客的生产部署。

### 2. 本地运行

进入 Public Engine：

```bash
cd ThinkerQAQ.github.io
npm ci
node scripts/validate-content-source.mjs ../blog-content
node scripts/assemble-content.mjs ../blog-content
npm run dev:site
```

默认访问：

```text
http://localhost:4321
```

如果只验证 Public Engine，不需要 Content Repository：

```bash
npm run assemble:fixtures
npm run check
npm run build
```

### 3. 添加内容

内容放在 `blog-content`：

```text
src/content/
├── articles/
│   └── en/
├── notes/
├── note-translations/
│   └── en/
├── projects/
└── series/

public/media/
```

可以直接从 [blog-content-template](https://github.com/ThinkerQAQ/blog-content-template) 中复制示例修改。

完整字段定义以 [`src/content.config.ts`](src/content.config.ts) 为准。

### 4. 部署

当前博客的生产链路是：

```text
ThinkerQAQ/blog-content
        │
        │ push master
        ▼
trigger-public-engine.yml
        │
        ▼
ThinkerQAQ.github.io / deploy.yml
        │
        ├── checkout 指定 content commit
        ├── validate + assemble
        ├── test + build
        └── deploy GitHub Pages
```

Public Engine 使用 `CONTENT_REPOSITORY` 指定内容仓库；私有 Content Repository 通过 `BLOG_CONTENT_DEPLOY_KEY` 读取。

如果部署自己的 fork，需要同时修改 `.github/workflows/deploy.yml` 中针对 `ThinkerQAQ/ThinkerQAQ.github.io` 的仓库判断，并配置自己的 `CONTENT_REPOSITORY`、GitHub Pages 和相关 Secrets。

Content Template 默认不带自动触发部署的 Workflow，避免模板绑定具体账号、Token 或仓库名。

## Documentation

### 主要组件

| 能力 | 实现 |
| --- | --- |
| Site | Astro + Markdown + Content Collections |
| Content | 独立 Content Repository |
| Search | Pagefind |
| AI Search | Cloudflare Workers + AI Search |
| Comments | utterances |
| Analytics | Umami |
| SEO | canonical / Open Graph / JSON-LD / hreflang / RSS / sitemap / IndexNow |
| Diagrams | PlantUML / Graphviz / draw.io |
| Tooling | BlogCTL |
| CI/CD | GitHub Actions |
| Deployment | GitHub Pages |

### 仓库结构

```text
src/                  Astro 页面、组件和内容 Schema
scripts/              构建、搜索、分发和维护脚本
workers/              Cloudflare Workers
tools/blogctl/         BlogCTL
docs/                  详细文档
fixtures/              Public Engine 测试内容
.github/workflows/     CI / CD
```

### 详细文档

- [BlogCTL](tools/blogctl/README.md)
- [Diagrams](docs/diagrams.md)
- [Analytics](docs/analytics.md)
- [International Syndication](docs/international-syndication.md)
- [Publishing Language](tools/blogctl/PUBLISHING_LANGUAGE.md)

## License

本仓库代码使用 [MIT License](LICENSE)。
