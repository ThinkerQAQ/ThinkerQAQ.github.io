# BlogCTL v0.1.175

本版完成 Medium **英文文章草稿创建与更新**链路的真实验收，并统一升级 BlogCTL Windows/Linux/macOS CLI、Native Host 与浏览器扩展版本。

## Medium 草稿发布链路

- **Create**：由 Compiler 输出原生段落（标题、列表、引用、行内格式、PRE 代码），由已登录的浏览器扩展按占位符把封面和正文 PNG 插入 Medium 编辑器。
- **Update**：显式指定现有未公开的 Medium 草稿 ID，替换正文及图片，保持原草稿 ID；不会重新创建文章。
- **图片保真**：宽幅 ASCII 结构示意图仅在 Medium 分发路径转为等宽 PNG，避免编辑器自动换行；其余代码块保留原生可复制的格式。修正原生引用和无序列表段落类型映射。
- **自动保存与失败保护**：逐图确认 Medium CDN 图片和占位符移除，整篇检查 DraftSaved；遇到真人验证、并发编辑、上传失败时停止并保留草稿；恢复时避免重复插入图片。
- **边界**：BlogCTL 只创建或更新草稿，**不会自动公开发布**；已经公开的 Medium 文章不会通过本链路更新。

## 实际验收

- 并发系列 1.5：42 张图片已保存至 Medium 草稿（原有少量历史段落的手动样式修正不计入本次 2～8 系列的完整验收）。
- 并发系列 **2～8**：7 篇英文文章均已完成 Create 和 Update，逐篇检查 **917 个内容块、119 张图片**，正文、代码、列表、引用、行内格式差异均为 0，图片缺失/损坏/占位符均为 0，且草稿 ID 保持不变、保存状态均为 DraftSaved。
- 独立测试草稿：真实 Create → 修改文字、列表、代码与图片 → Update，原草稿 ID 保持不变，图片数量从 3 变为 4，逐项复查通过。
- 已补充单元测试及浏览器联调后的异常处理；Medium 草稿依赖浏览器有效登录状态。

## 兼容与升级

- 保留现有 Buffer / Hashnode 及其余平台逻辑，无需重新初始化 BlogCTL Data。
- Windows 安装目录升级时保留 `Data/`、凭据、历史任务及发布关联记录。
- 浏览器扩展与 Native Host / Bridge 使用同一版本 `0.1.175`。升级扩展文件后应重新加载扩展；已安装用户可保持扩展 ID 不变。

## GitHub Release 构件

- Windows amd64 / arm64
- macOS amd64 / arm64
- Linux amd64 / arm64
- `blogctl-extension.zip`
- `SHA256SUMS`

版本：`0.1.175`
