# 内容字段与关联

下列路径均相对于**内容仓库**；装配时会复制到引擎。集合校验见 [`src/content.config.ts`](../../../src/content.config.ts)，URL 和翻译关系见 [`src/lib/content.ts`](../../../src/lib/content.ts)。

## 内容集合

| `src/content/` 下的目录 | 用途 | 标识方式 |
| --- | --- | --- |
| `articles/` | 文章，含 `en/` 下的英文版本 | 相对文件名去掉 `.md` |
| `notes/` | 笔记及分类、主题导航 | 相对文件名去掉 `.md` |
| `note-translations/` | 翻译后的笔记正文 | `translationOf` 指向原笔记 ID |
| `projects/` | 项目简介、链接与正文 | 相对文件名去掉 `.md` |
| `project-translations/` | 翻译后的项目正文 | `translationOf` 指向原项目 ID |
| `series/` | 阅读顺序与相关笔记 | 相对文件名去掉 `.md` |
| `life/` | 摄影图文记录 | 相对文件名去掉 `.md` |
| `workout-summaries/` | 公开的月度健身汇总 | JSON 中的 `YYYY-MM` 月份 |

图片放在 `public/media/`，正文通过 `/media/...` 引用。`src/data/content-manifest.json` 保存导入笔记的来源和索引元信息；需要可运行的 manifest 时，可从[内容模板](https://github.com/ThinkerQAQ/inkerio-content-template)开始。

## 文章

| 字段 | 必填或默认值 | 说明 |
| --- | --- | --- |
| `title`、`description` | 必填字符串 | 标题和简介 |
| `publishedAt` | 必填 | 带引号和时区的 ISO 时间戳，如 `"2026-10-22T10:00:00+08:00"` |
| `updatedAt` | 可选 | 实质修订时间 |
| `language` | `zh` | `zh` 或 `en` |
| `status` | `draft` | `draft` 或 `published` |
| `coverImage`、`coverImageAlt` | 已发布时必填 | 封面 URL 和替代文字 |
| `tags` | `[]` | YAML 字符串列表 |
| `featured` | `false` | 是否参与精选展示 |
| `translationOf` | 可选 | 直接指向原始文章 ID |
| `series`、`project` | 可选 | 所属系列或项目 ID |
| `sourceNote` | 可选 | 来源笔记 ID |
| `relatedNotes` | `[]` | 相关笔记 ID，由集合引用校验 |

`articles/hello.md` 设置 `language: zh` 后，URL 为 `/articles/hello/`；`articles/en/hello.md` 设置 `language: en` 后，URL 为 `/en/articles/hello/`。ID 保留嵌套目录，修改标题不改变 URL。

草稿默认不显示，本地预览也一样。显式设置 `INCLUDE_DRAFTS=true` 可预览文章草稿；RSS 中的文章仍只取 `published`。完整文章示例见[首个站点教程](../tutorial/first-site.md)。

## 笔记与翻译

笔记必填 `title`、`description`、`sourcePath`、`category`、`categoryLabel`、正整数 `order` 和 `updatedAt`。`sourcePath` 记录来源，`category` 用于路由，`categoryLabel` 用于展示。可选 `topic`、`topicLabel` 和 `topicPath` 组织主题；`topicPath` 每项包含 `id` 和可选 `label`。

笔记的 `status` 是 `active` 或 `historical`，默认 `active`，与文章的草稿状态不同。还可设置 `tags`、`featured`、`indexable`、`language`、可选 `createdAt` 和 `canonicalPath`。`indexable` 默认为 `true`。

笔记翻译必填 `title`、`description`、`translationOf`、`language`、`updatedAt`，正文填写翻译内容。例如原文是 `notes/go/memory.md`，英文翻译使用 `translationOf: go/memory`，关联到 `/en/notes/go/memory/`。

## 项目与系列

| 集合 | 必填字段 | 可选关联 |
| --- | --- | --- |
| 项目 | `title`、`description`、`status`、`startedAt`、`updatedAt` | `github`、`tutorials`、`documentation`、`translations`、`tags`、`featured` |
| 系列 | `title`、`description`、`status`、`updatedAt` | `project`、`relatedArticles`、`relatedNotes`、`relatedNoteCategories`、`relatedNoteScopes`、`translations`、`featured` |

项目状态：`exploring`、`building`、`maintained`、`completed`。系列状态：`planned`、`active`、`complete`。这些日期字段支持 `2026-10-22` 形式的值。

系列的 `relatedArticles` 按阅读顺序列出**原始文章 ID**。文章同时填写 `series`，使文章页能找到所属系列。英文导航会选择这些原文对应的译文。

项目的 `translations.en` 提供英文标题、简介和可选标签；`project-translations/` 中的文件提供翻译正文，必填 `translationOf`、`language` 和 `updatedAt`。

项目 `tutorials` 和 `documentation` 可以填写归属该项目的原始文章 ID，也可填写外部资源：

```yaml
documentation:
  - title: "使用说明"
    url: "https://example.com/docs/"
    description: "安装与配置"
    translations:
      en:
        title: "User guide"
        url: "https://example.com/en/docs/"
        description: "Installation and configuration"
```

## 摄影与健身

摄影记录必填带时区的 `publishedAt`；`status` 默认 `draft`，`language` 默认 `zh`，`images` 默认 `[]`，标题和简介可省略。每张图片需要 `src`、正整数 `width` 和 `height`，可选 `thumbnail`、`alt`。文章草稿预览开关不会公开摄影草稿。

健身 JSON 必填 `month`（`YYYY-MM`）和 `trainingDays`（0–31 的整数），可选 `durationMinutes`、`volumeKg`、`demo`（默认 `false`），额外字段会被拒绝。完整示例和 URL 见[生活记录](../how-to/life-records.md)。

## 常见校验错误

| 现象 | 检查位置 |
| --- | --- |
| 已发布文章校验失败 | 两个封面字段，以及 `publishedAt` 的时区 |
| 页面没有出现 | 状态、语言、当前内容源，然后重新装配 |
| 译文缺失或构建失败 | 原文 ID 是否准确、原文是否存在、是否直接指向原文 |
| 找不到相关笔记 | ID 应相对于 `notes/`，不带扩展名 |
| 系列顺序不对 | `relatedArticles` 顺序，以及文章的 `series` |
| 健身 JSON 不通过 | 额外字段、月份格式、数值范围 |

装配后运行 `npm run check`，再通过 `npm run build` 检查路由生成和跨文件关系。
