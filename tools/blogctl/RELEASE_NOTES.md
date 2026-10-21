# BlogCTL v0.1.178

修复 Medium 并发系列第 0 篇暴露的 Markdown **表格格式丢失、表格中的多余 `**` 标记**问题，明确代码块真实的持久化行为。

## Medium 表格保真

- 之前 Compiler 的 `flattenMediumTables` 将 Markdown 表格降级为逐行普通段落，破坏两列布局，并对已经包含 `**Atomicity**` 的表头单元格重复添加 Markdown 强调标记。
- Medium 不提供可靠的原生可编辑表格段落，因此仅在 **Medium 专用编译**时，识别合法的 Markdown 表格，保留列结构，使用已有 Sharp 渲染组件和 SVG 原生 `<text>` 节点输出 PNG 图片；由已经验证过的浏览器贴图流程插入草稿。
- 预处理只识别有效表格，避开代码围栏；其他平台的 Markdown 表格保留不变。对于未按表格识别的降级文本，避免重复加粗标记。
- 文本和单元格行高采用计算布局，不依赖浏览器 `<foreignObject>`，避免 Sharp 渲染空白文字；Renderer 的尺寸和长度有上限。

## 第 0 篇真实草稿验证

- 通过 BlogCTL 新建私有测试草稿 `e81d5dc8c2f4`，再使用同一个草稿 ID 完成真实 Update；没有自动发布。
- 新表格图片已插入 Medium：服务器 GraphQL 实际返回 6 张原生图片（原本 5 张，加表格 1 张），0 个图片占位符，`DraftSaved`。
- **16 个 PRE 代码段**保持不变；包含 Goroutine A/B 的 Go 源码仍处于同一个服务器端 PRE 段落和浏览器 `<pre>` 元素中。无需修改代码的换行格式。
- 首次 Update 在第一张图片插入时没有取得返回值，保留草稿 ID 和失败现场；预检确认无图片、6 个原始占位符并且已保存后，采用相同 BlogCTL Job 的受控 Retry，最终执行成功。

## 兼容

- 保留 v0.1.177 的 Medium 保存回读修复、远端文章清单、创建/更新能力，不改变其他发布平台。
- CLI、Bridge、Native Host、浏览器 Extension 升级到 `0.1.178`；保留 Windows `Data/` 和现有任务。
- 新的表格渲染器使用 `engine_root/tools/blogctl/renderers/node/publishing-image.mjs`；部署时需要同步本地 EngineRoot 源码。

版本：`0.1.178`
