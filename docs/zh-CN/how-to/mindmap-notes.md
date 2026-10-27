# 添加交互式思维导图笔记

Inkerio 支持将**同一篇 Markdown 笔记**切换为正常正文或交互式 Markmap 思维导图。思维导图由 Markdown 结构生成，不是上传的图片，也不是直接编辑的 `.xmind` 文件。

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

`defaultView: mindmap` 表示浏览器启用 JavaScript 时默认打开思维导图。省略字段或设置 `defaultView: markdown` 则默认显示 Markdown；如果 JavaScript 不可用，原始正文仍可阅读。此字段仅用于**笔记**，不适用于文章页面。

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
