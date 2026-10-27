# 添加或更新文章

在内容仓库编辑，再装配到引擎。[首个站点教程](../tutorial/first-site.md)提供完整的最小文章示例。

1. 创建或修改 `blog-content/src/content/articles/YOUR_ID.md`。
2. 填写标题、简介、时间、语言和状态；已发布文章还需封面 URL 和替代文字，详见[字段参考](../reference/content-schema.md)。
3. 本地图片放到 `blog-content/public/media/`，正文通过 `/media/...` 引用。
4. 在引擎根目录运行：

```bash
go run ./tools/blogctl/cmd site assemble --content-root ../blog-content
npm run check
npx --no-install astro dev --port 4321
```

如果开发服务已在运行，只需重新装配和执行 `check`。检查 `/articles/YOUR_ID/` 或 `/en/articles/YOUR_ID/` 的标题、正文、图片和语言切换。完整构建、预览前先停止开发服务。

新草稿可以省略 `status` 或填写 `draft`。Bash 中通过 `INCLUDE_DRAFTS=true` 启动 Astro 可预览文章草稿；PowerShell 设置同名环境变量。除非有意公开草稿，不要把该开关带入生产构建。

更新已发布文章时保留 ID 和 `publishedAt`；有实质修订时设置 `updatedAt`，仅调整格式不必改日期。原文和图片提交到内容仓库；需要检查最终渲染和关联时，装配后执行 `npm run build`。

网站部署和站外文章更新分别进行，按需查看[部署指南](deploy.md)和 [BlogCTL 分发教程](../../../tools/blogctl/docs/zh-CN/tutorial/first-publish.md)。

## 首页的笔记展示

首页「**技术知识**」分为两层：「**最近笔记**」用于展示正在更新的新内容，「**知识分类**」用于长期检索和归档。

- 最近笔记最多展示 **3 篇**，按 `updatedAt` 倒序排列，只选 `status: active` 且 `indexable: true` 的笔记；**同一分类最多 2 篇**。更新时间相同时优先 `featured: true`，其次使用 `order` 与 ID 保证顺序稳定。
- `status: historical` 的旧笔记保留在分类集合内，不会为了凑满 3 篇而混入最近笔记。
- 首页只列出 `src/components/HomeKnowledgeHub.astro` 中定义的技术分类。需要新增首页分类入口时，在这个配置中补充即可，无须新增内容字段。
- 英文首页只展示存在英文 `noteTranslations` 的笔记，标题和更新时间取自英文译文，不会把中文笔记直接放到英文首页。

字段说明参见[笔记内容规范](../reference/content-schema.md)，导图笔记参见[思维导图教程](mindmap-notes.md)。
