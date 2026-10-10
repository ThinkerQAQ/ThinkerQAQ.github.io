# 系统架构

博客引擎负责把版本独立的 Markdown 内容转换为可部署的静态网站。

## 核心模型

```text
blog-content（文章、笔记、项目）
          │
          ▼
BlogCTL 内容装配 ──► src/content（构建输入）
                              │
                              ▼
                         Astro 渲染
                              │
                              ▼
                       dist/ + Pagefind
                         ├── GitHub Pages
                         └── EdgeOne Makers

BlogCTL 发布 Adapter ──► 第三方文章平台
```

## 职责边界

| 部分 | 负责什么 |
| --- | --- |
| `blog-content` | Markdown 原文、翻译、文章图片及系列 |
| `src/`、`astro.config.mjs` | 页面、路由、SEO、RSS、内容展示 |
| `tools/blogctl/` | 装配、编译、资源处理、发布和索引 |
| `scripts/`、`src/markdown/` | 构建期间的图表与搜索索引处理 |
| `.github/workflows/deploy.yml` | GitHub Pages 和 EdgeOne 静态部署 |
| `workers/` | 可选的统计、反应和搜索服务 |

## 为什么分开

写作频率与引擎迭代频率不同。把原文放到独立仓库，站点构建只读取内容，便于升级渲染组件且不会覆盖文章源文件。

例如，执行[内容装配教程](../tutorial/first-site.md)后，生成的 `src/content/` 可以重新生成；真实修改仍应提交到 `blog-content`。

搜索与浏览器服务的实现见[站点集成](search-and-integrations.md)，架构取舍见[原则](../architecture/principles.md)。
