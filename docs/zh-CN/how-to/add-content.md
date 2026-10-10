# 添加或修改文章

文章在内容仓库中编辑，引擎仓库中的 `src/content/` 是生成结果。

## 前提

准备好与引擎平级的 `blog-content/`，也可以使用公开的[内容模板](https://github.com/ThinkerQAQ/blog-content-template)。

## 操作

1. 编辑 `blog-content/src/content/articles/` 下的 Markdown；笔记、项目和系列分别位于对应集合。
2. 根据[内容 Schema](../reference/content-schema.md)检查 Frontmatter。
3. 在引擎根目录运行：

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run check
npx --no-install astro dev --port 4321
```

浏览器检查目标文章是否能正常打开。提交时只提交内容仓库中的原文，避免把生成的 `src/content/` 当成内容源。
