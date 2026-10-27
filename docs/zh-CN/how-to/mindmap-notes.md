# 文章与笔记的正文／思维导图切换

Inkerio 支持将**同一篇 Markdown 文章或笔记**切换为正常正文或交互式 Markmap 思维导图。思维导图由 Markdown 结构生成，不是上传的图片，也不是直接编辑的 `.xmind` 文件。

## 已有文章和笔记如何使用

所有文章和笔记详情页右下角均提供悬浮视图切换按钮，包括旧内容和翻译页面，无需逐篇启用或迁移内容。索引页和分类页不提供全文导图视图。

| 内容 | 初始视图 | 翻译行为 |
| --- | --- | --- |
| 文章 | 默认正文，可由该文章的 `defaultView` 修改 | 使用翻译自己的正文和配置 |
| 笔记 | 默认正文，设置 `defaultView: mindmap` 后默认导图 | 继承原笔记的配置，使用翻译自己的正文 |

如果希望已有文章默认打开导图，在 `src/content/articles/<slug>.md` 的现有 Frontmatter 中添加 `defaultView: mindmap`；英文文章可在 `src/content/articles/en/<slug>.md` 中独立设置。保留原有发布元数据，省略此字段仍默认显示正文。

切换到导图时才按需加载渲染器与 Markdown 源文件。加载失败会保留正文，支持重新尝试。如果详情页没有按钮，先关闭 AI 面板、移动端阅读导航或退出导图全屏，这些状态会暂时隐藏悬浮按钮；再确认浏览器启用了 JavaScript，且部署版本已包含该功能。

## 1. 编写层级化笔记

在内容仓库创建 `blog-content/src/content/notes/system-design-map.md`：

```markdown
---
title: "软件系统设计导图"
description: "用于展示软件系统设计的交互式思维导图。"
sourcePath: "src/content/notes/system-design-map.md"
category: example
categoryLabel: Example
order: 2
updatedAt: "2026-10-27T00:00:00Z"
language: zh
status: active
defaultView: mindmap
---

# 软件系统设计

## 需求分析

### 功能需求

- 典型用户场景
- 输入与输出

## 架构设计

### 核心组件

- 网关
- 应用服务
- 数据库
```

建议用一个 `#` 标题作为根节点，后续 `##`、`###` 等标题以及嵌套列表构建分支，节点文本尽量简洁。

`defaultView: mindmap` 表示浏览器启用 JavaScript 时默认打开思维导图。省略字段或设置 `defaultView: markdown` 则默认显示 Markdown；如果 JavaScript 不可用，原始正文仍可阅读。所有文章和笔记详情页都提供视图切换按钮。此字段适用于**文章和笔记**，仅决定初始视图，不影响切换功能是否可用。文章的英文翻译使用自己的 Markdown 正文和 defaultView 配置。

导图依据标题和嵌套列表生成，不会自动生成 AI 摘要。没有结构节点的纯段落页面会显示以页面标题为内容的单个根节点。

## 2. 添加英文翻译（可选）

创建 `blog-content/src/content/note-translations/en/system-design-map.md`：

```markdown
---
title: "Software System Design Map"
description: "An interactive system-design mind map."
translationOf: system-design-map
language: en
updatedAt: "2026-10-27T00:00:00Z"
---

# Software System Design

## Requirements

- Functional requirements
- Non-functional requirements

## Architecture

- Gateway
- Services
- Database
```

中文路由是 `/notes/system-design-map/`，英文路由是 `/en/notes/system-design-map/`。**英文翻译继承原笔记的默认视图**，但思维导图从英文正文生成。建议中英文保持对应的分支层级；不要在译文 Frontmatter 中重复添加 `defaultView`。

## 3. 装配与预览

在 Inkerio 引擎目录执行：

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run check
npx --no-install astro dev --port 4321
```

分别访问 `/notes/system-design-map/` 与 `/en/notes/system-design-map/`。页面右下角只有**一个圆形视图切换图标**，位于阅读跳转、AI 问答按钮上方，尺寸与位置对齐；点击一次切换「正文 / 导图」，切换后定位到笔记正文的起点。图标表示点击后将进入的模式（导图图标或文档图标），鼠标悬停及读屏器会提示对应操作。打开 AI 问答面板或移动端阅读导航时会暂时隐藏，避免遮挡。导图支持拖动平移、滚轮缩放、节点展开/折叠；画布右上角的独立工具栏支持缩放、全局适配、递归展开控制和全屏，复用了官方 `markmap-toolbar`，全屏由浏览器 Fullscreen API 提供。

渲染模块按需加载；大图默认折叠较深层级，点击节点逐步展开。**全局适配只适配当前已展示的节点**，不会自动展开所有隐藏的分支。如果知识树非常大，建议按主题拆分成多篇笔记。

可直接参考 [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template) 中 `sample-mindmap.md` 的中英文示例。当前不支持直接解析或编辑 `.xmind` 文件；请先导出、转换为 Markdown 层级并检查内容。

相关文档：[内容字段参考](../reference/content-schema.md)、[公开内容模板](../examples/content-template.md)、[添加与更新内容](add-content.md)。
