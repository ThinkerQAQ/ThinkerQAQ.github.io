# 内容集合与 Schema

Astro 集合定义位于 [`src/content.config.ts`](../../../src/content.config.ts)，内容装配入口位于 [`tools/blogctl/cmd/site.go`](../../../tools/blogctl/cmd/site.go)。

| 集合 | 内容仓库中的路径 |
| --- | --- |
| 文章 | `blog-content/src/content/articles/` |
| 笔记 | `blog-content/src/content/notes/` |
| 笔记翻译 | `blog-content/src/content/note-translations/` |
| 项目 | `blog-content/src/content/projects/` |
| 系列 | `blog-content/src/content/series/` |
| 图片等媒体 | `blog-content/public/media/` |

`blog-content` 是权威数据源；引擎内的 `src/content/` 是装配结果。

各个 Frontmatter 字段以 TypeScript Schema 为准，避免在文档里复制一份会过期的字段表。需要可运行的内容示例可查看 [fixtures](../examples/fixtures.md) 和[公开模板](https://github.com/ThinkerQAQ/blog-content-template)。

## 项目教程与文档引用

项目的 tutorials 和 documentation 支持站内文章 ID 或外部文档链接。文章 ID 必须对应归属当前项目的原始文章。外部链接提供 title、url，可选 description，以及按语言覆盖标题、链接和描述的 translations。

默认链接可指向中文文档，用 translations.en 指向英文版本。博客页面直接链接 GitHub 中维护的文档，避免重复维护。两种引用方式见[项目示例](../../../fixtures/src/content/projects/sample-project.md)。
