# 摄影与健身记录

摄影从 `life` 集合读取 Markdown 记录，路径为 `/life/` 和 `/en/life/`。健身读取独立的 `workoutSummaries` JSON，路径为 `/life/fitness/` 和英文对应页。

内容放在自己的内容仓库；公开示例来自 [inkerio-content-template](https://github.com/ThinkerQAQ/inkerio-content-template)，引擎只管理 Schema 与渲染。

## 添加摄影记录

在内容仓库 `src/content/life/` 新建 Markdown，保留原始发布时间、时区、文案和图片顺序：

```markdown
---
publishedAt: "2024-08-18T18:30:00+08:00"
status: published
language: zh
location: 杭州
tags: [摄影]
images:
  - src: /media/life/hangzhou/lake.jpg
    thumbnail: /media/life/hangzhou/lake-thumb.jpg
    alt: 傍晚的湖面
    width: 2400
    height: 1600
---

原始文案。
```

`title`、`description` 可省略，无需封面。`status` 默认 `draft`，只有 `published` 才会展示，开发模式也一样。时间戳需加引号并带时区，列表按 `publishedAt` 排序，日期按 Asia/Shanghai 展示。

图片可用站点根路径或 HTTP(S) URL。本地素材放在内容仓库 `public/media/`；宽高应是原图像素尺寸，缩略图可省略。图片列表可以为空，不限制总数量。发布前检查文案、照片及定位中是否有不想公开的内容。

中文记录需带「摄影」标签，英文记录需 `language: en` 和 `Photography` 标签，才会进入对应语言的摄影时间线。其他标签不会自动生成栏目。

永久链接为 `/life/record/<文件ID>/`，修改日期不会改变链接；英文有 `/en` 前缀。仅在实质修改时设置 `updatedAt`，搬文件无需改变日期。

## 相册展示

时间线最多显示九张缩略图；打开任一图片后，可在 PhotoSwipe 中浏览原顺序的整个相册，支持键盘、触摸和缩放。详情页每次加载九张，无 JavaScript 时仍提供图片链接。

长文案在时间线折叠，在详情页完整展示。正文可以图文交错；正文 Markdown 图片使用单图查看，frontmatter 的 `images` 提供相册导航。

## 添加健身月汇总

在内容仓库 `src/content/workout-summaries/` 创建 JSON。以下为示例数据：

```json
{
  "month": "2026-08",
  "trainingDays": 13,
  "durationMinutes": 916,
  "volumeKg": 59200,
  "demo": true
}
```

Schema 严格限制字段：月份 `YYYY-MM`、训练天数 0–31，可选非负整数时长、非负训练总量，以及默认 false 的 `demo`。缺少时长或总量时展示 `—`，不会猜测。

`/life/fitness/` 展示最新月、汇总指标和年度柱状图；`/life/fitness/YYYY/MM/` 选择对应月份。两个语言共享汇总数据。`demo: true` 用于示例，真实公开数据应删除该标记或设为 false。

只保存月度汇总，不要加入逐日训练、动作、组数、会话 ID、开始时间或源 API Token；未知字段会校验失败。月度数据是公开内容，发布前确认可公开。RSS 的摄影和健身起点规则见[集成参考](../reference/integrations.md)。

## 预览

在引擎目录装配自己的内容：

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npx --no-install astro dev --port 4321
```

`npm run dev:quick` 会重新选择公开模板。空集合展示空状态，不会补造记录。完整字段见[内容 Schema](../reference/content-schema.md)。
