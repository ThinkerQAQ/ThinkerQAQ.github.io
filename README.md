# ThinkerQAQ Blog

[English](./README_EN.md)

在线博客：<https://thinkerqaq.github.io/>

基于 [Astro](https://astro.build/) 的中英双语个人技术博客与数字花园，围绕 **Articles / Notes / Series / Projects** 组织内容。

这个仓库是博客的 **Public Engine**：保存网站代码、内容 Schema、校验逻辑、构建与部署流程以及公开工具；真实博客内容保存在独立的私有内容仓库中，只在构建时注入，不提交到本仓库。

## 架构

```text
Private Content Repository
Articles / Notes / Series / Projects / Media
                 │
                 │ build-time checkout
                 ▼
ThinkerQAQ.github.io
Astro / Schema / Validation / Search / Tooling / CI
                 │
                 ▼
           GitHub Pages
                 │
                 ▼
      https://thinkerqaq.github.io/
```

仓库边界遵循一个简单原则：

```text
Private Content = DATA
Public Engine   = CODE + SCHEMA + VALIDATION + BUILD + DEPLOY
```

生产内容不会提交到这个公开仓库。Pull Request 和本地基础设施验证使用 `fixtures/` 中的合成内容。

## 内容模型

| 类型 | 用途 |
| --- | --- |
| Articles | 正式文章 |
| Notes | 学习记录与历史笔记 |
| Series | 将相关内容组织成连续阅读路径 |
| Projects | 项目及其关联的文章、系列和知识内容 |

## 主要能力

- **Astro**：静态网站与内容渲染
- **中英双语**：中文默认站点与 `/en/` 英文站点
- **Pagefind**：静态全文搜索
- **Cloudflare**：AI Search、Workers 等在线能力
- **Umami**：隐私友好的访问统计
- **utterances**：基于 GitHub Issues 的评论
- **SEO**：canonical、Open Graph、JSON-LD、`hreflang`、RSS、sitemap、robots.txt、IndexNow
- **GitHub Actions + GitHub Pages**：自动构建与发布
- **BlogCTL**：位于 `tools/blogctl/` 的跨平台博客维护工具

## 本地验证 Public Engine

本仓库不包含真实生产内容，因此默认使用 fixtures 验证引擎：

```bash
npm ci
npm run assemble:fixtures
npm run check
npm run build
```

这套流程会验证公开引擎本身，而不会把私有内容复制进 Git 历史。

## 生产构建

生产部署时，GitHub Actions 会：

1. checkout Public Engine；
2. checkout 指定的私有内容 commit；
3. 校验内容源契约；
4. 将内容组装到构建工作区；
5. 执行测试、Astro check 和静态构建；
6. 部署到 GitHub Pages；
7. 执行搜索与搜索引擎通知等部署后任务。

Public Engine 可以通过 `content_sha` 固定构建某个确定的内容版本，从而保持内容与部署之间的可追踪性。

## 仓库边界

这个仓库应该包含：

- Astro 网站实现；
- 内容 Schema 与关系模型；
- 内容源校验与组装逻辑；
- 搜索、SEO、Workers 等公开基础设施；
- BlogCTL 与公开开发工具；
- CI / CD 与 GitHub Pages 部署逻辑；
- 不含真实私人内容的测试 fixtures。

这个仓库不应该包含：

- 私有 VNote 原始知识库；
- 草稿和未公开内容；
- 从私有仓库复制过来的生产内容与媒体；
- `dist/` 等构建产物。

边界由 `.gitignore` 和仓库校验脚本共同约束。
