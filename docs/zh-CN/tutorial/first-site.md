# 创建第一个站点

完成这篇教程后，你自己的文章会出现在 `/articles/hello-inkerio/`。引擎代码和文章分别由两个 Git 仓库管理。

## 1. 准备内容仓库

打开 [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template)，选择 **Use this template → Create a new repository** 创建自己的仓库，也可以 Fork。按实际需要选择公开或私有仓库。

只在本地体验时，可以直接克隆公开模板：

```bash
mkdir inkerio-workspace
cd inkerio-workspace
git clone https://github.com/ThinkerQAQ/ThinkerQAQ.github.io.git
git clone https://github.com/ThinkerQAQ/inkerio-content-template.git blog-content
```

正式写作时，将第二条 clone 命令中的 URL 换成自己的仓库，保留本地目录名 `blog-content`。推送前用 `git -C blog-content remote -v` 确认远端。

## 2. 安装并装配

先满足[快速开始的环境要求](../quick-start.md)，然后在引擎目录运行：

```bash
cd ThinkerQAQ.github.io
npm ci
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npx --no-install astro dev --port 4321
```

打开 [localhost:4321](http://localhost:4321)。装配成功会输出 `[site] assembled content=`，页面中应显示模板内容。

装配会替换引擎的 `src/content/`；内容仓库存在 `public/media/` 时也会替换对应媒体目录，有 manifest 时会一并复制。文章始终在内容仓库编辑，避免下一次装配丢失对生成文件的修改。

## 3. 添加文章

用编辑器创建 `blog-content/src/content/articles/hello-inkerio.md`：

```markdown
---
title: "你好，Inkerio"
description: "在这个站点发布的第一篇文章。"
publishedAt: "2026-10-22T10:00:00+08:00"
language: zh
status: published
tags: [Example]
coverImage: "/media/articles/sample-article/cover.svg"
coverImageAlt: "内容模板提供的示例封面"
---

这篇文章保存在独立的内容仓库。
```

这里复用了模板封面。自己的封面放在 `blog-content/public/media/` 下，并填写站点根路径，例如 `/media/articles/hello-inkerio/cover.jpg`。

`publishedAt` 使用带引号和时区的时间戳。已发布文章必须有非空的 `coverImage` 和 `coverImageAlt`。省略 `status` 时默认为 `draft`；草稿默认不显示，只有显式设置 `INCLUDE_DRAFTS=true` 才会进入草稿预览。

## 4. 刷新预览

保持开发服务运行，在另一个终端进入引擎根目录：

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run check
```

打开[文章页面](http://localhost:4321/articles/hello-inkerio/)，检查标题、简介、封面和正文。Astro 监听生成文件，但不会自动装配外部内容仓库的修改；每次编辑原文后重新运行装配。

重新启动预览时，使用 `npx --no-install astro dev --port 4321`。`npm run dev` 和 `dev:quick` 会重新选择公开模板。

## 5. 添加英文版本

创建 `blog-content/src/content/articles/en/hello-inkerio.md`，填写相同的必填字段、英文正文，并设置 `language: en` 和 `translationOf: hello-inkerio`。重新装配后，URL 为 `/en/articles/hello-inkerio/`；`translationOf` 指向原文文件 ID，不带 `.md`。

URL 由文件 ID 决定，修改标题不会改变 URL。发布后尽量保持文件名稳定，避免链接失效。更多字段与关联方式见[内容参考](../reference/content-schema.md)。

## 6. 构建并保存

安装[图表依赖](../how-to/diagnose-build.md)后，停止开发服务，运行：

```bash
npm run build
npm run preview
```

构建读取当前已装配内容，将静态文件写入 `dist/` 并生成搜索索引。站内搜索应在构建后的预览中验证。

用 `git -C ../blog-content diff` 检查原文修改，并在内容仓库提交、推送。引擎配置和代码的修改提交到引擎仓库。部署前先完成[站点设置](../how-to/customize-site.md)，再按[部署指南](../how-to/deploy.md)操作。
